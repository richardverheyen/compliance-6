#!/usr/bin/env python3
"""
Step 0: Table of Contents extraction and classification pipeline.

Sub-steps:
  0a  Discover ToC page range and extract regex patterns (LLM-assisted, human review)
  0b  Extract structured ToC JSON using discovered patterns (pdfplumber)
  0c  Classify ToC sections to business processes (LLM, human review + approval)

Outputs (written to run_dir):
  toc_config.json      — ToC page range + regex patterns (after 0a approval)
  toc.json             — Structured list of ToC entries (after 0b)
  toc_classified.json  — Section → process mapping + process_to_sections index (after 0c approval)

Usage:
    python toc_extractor.py chapter4.pdf runs/1          # Run all steps
    python toc_extractor.py chapter4.pdf runs/1 --step 0a
    python toc_extractor.py chapter4.pdf runs/1 --step 0b
    python toc_extractor.py chapter4.pdf runs/1 --step 0c
"""

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path

import anthropic
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

_PIPELINE_DIR = Path(__file__).parent

MODEL = "claude-sonnet-4-6"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _confirm(prompt: str) -> bool:
    """Prompt user for y/n confirmation."""
    while True:
        answer = input(f"\n{prompt} [y/n]: ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False


def _extract_page_text(pdf_path: str, page_numbers: list[int]) -> str:
    """Extract raw text from given 1-indexed page numbers using pdfplumber."""
    chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for pn in page_numbers:
            if 1 <= pn <= len(pdf.pages):
                text = pdf.pages[pn - 1].extract_text() or ""
                chunks.append(f"--- Page {pn} ---\n{text}")
    return "\n\n".join(chunks)


def _extract_page_lines(pdf_path: str, page_numbers: list[int]) -> list[tuple[int, str]]:
    """Extract (page_number, line_text) tuples from given pages."""
    result = []
    with pdfplumber.open(pdf_path) as pdf:
        for pn in page_numbers:
            if 1 <= pn <= len(pdf.pages):
                text = pdf.pages[pn - 1].extract_text() or ""
                for line in text.split("\n"):
                    line = line.strip()
                    if line:
                        result.append((pn, line))
    return result


def _pdf_page_count(pdf_path: str) -> int:
    with pdfplumber.open(pdf_path) as pdf:
        return len(pdf.pages)


# ---------------------------------------------------------------------------
# Step 0a: Discover ToC page range and regex patterns
# ---------------------------------------------------------------------------

TOC_HEADER_RE = re.compile(r"^\s*(table\s+of\s+contents|contents)\s*$", re.IGNORECASE)


def _scan_for_toc_start(pdf_path: str) -> int | None:
    """Scan all pages for a 'Table of Contents' or 'Contents' heading. Returns 1-indexed page."""
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            for line in text.split("\n"):
                if TOC_HEADER_RE.match(line.strip()):
                    logger.info(f"Found ToC header on page {page_num}")
                    return page_num
    return None


def _scan_for_toc_end(pdf_path: str, toc_start: int) -> int:
    """
    Starting from toc_start, advance page by page until the ToC pattern breaks.
    A page is considered still part of the ToC if at least 25% of its non-empty
    lines end with a page number (digit sequence at end of line).
    Returns the last 1-indexed ToC page number.
    """
    PAGE_NUM_RE = re.compile(r"\s+\d+\s*$")
    last_toc_page = toc_start

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for page_num in range(toc_start, total + 1):
            page = pdf.pages[page_num - 1]
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if not lines:
                continue
            hits = sum(1 for l in lines if PAGE_NUM_RE.search(l))
            ratio = hits / len(lines)
            if ratio >= 0.25:
                last_toc_page = page_num
            else:
                # No longer looks like ToC — stop
                break

    logger.info(f"ToC spans pages {toc_start}–{last_toc_page}")
    return last_toc_page


def step_0a(pdf_path: str, run_dir: str) -> dict:
    """
    Discover ToC page range + regex patterns.
    Writes toc_config.json after human approval.
    Returns the toc_config dict.
    """
    print("\n" + "=" * 60)
    print("STEP 0a — ToC Pattern Discovery")
    print("=" * 60)

    # 1. Locate ToC pages
    toc_start = _scan_for_toc_start(pdf_path)
    if toc_start is None:
        logger.warning("No ToC header found automatically. Defaulting to page 1.")
        toc_start = 1

    toc_end = _scan_for_toc_end(pdf_path, toc_start)
    toc_pages = list(range(toc_start, toc_end + 1))

    print(f"\nDetected ToC on pages: {toc_pages}")
    if not _confirm("Are these the correct ToC pages? (If not, you'll be asked to enter them manually)"):
        raw = input("Enter ToC page numbers (comma-separated, e.g. 2,3,4): ").strip()
        toc_pages = [int(p.strip()) for p in raw.split(",")]
        print(f"Using pages: {toc_pages}")

    # 2. Extract ToC text and send to LLM for pattern discovery
    toc_text = _extract_page_text(pdf_path, toc_pages)

    print(f"\nSending {len(toc_pages)} ToC page(s) to LLM for pattern extraction...")

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"""You are analysing the Table of Contents pages of a regulatory PDF document.

Your task: identify the regex patterns that match section/subsection numbering used in this document.

ToC text:
{toc_text}

Return a JSON object with these fields:
- "toc_pages": list of page numbers (integers) containing the ToC
- "entry_pattern": a Python regex string that matches the LEADING section code on a ToC line (e.g. "^Part \\\\d+\\\\.\\\\d+" or "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+")
- "sub_entry_patterns": list of additional Python regex strings for sub-section codes at deeper levels (may be empty list)
- "example_matches": list of 5 example section codes found in the ToC that these patterns would match
- "notes": any observations about the ToC structure

Return ONLY a valid JSON object, no explanation.""",
            }
        ],
    )

    raw_json = response.content[0].text.strip()
    # Strip markdown code fences if present
    raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json)
    raw_json = re.sub(r"\s*```$", "", raw_json)

    try:
        toc_config = json.loads(raw_json)
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned invalid JSON: {e}\nRaw: {raw_json}")
        sys.exit(1)

    # Override toc_pages with our confirmed value
    toc_config["toc_pages"] = toc_pages

    # 3. Human review
    print("\n--- LLM-discovered regex patterns ---")
    print(f"  entry_pattern    : {toc_config.get('entry_pattern')}")
    for i, p in enumerate(toc_config.get("sub_entry_patterns", [])):
        print(f"  sub_entry[{i}]     : {p}")
    print(f"  example_matches  : {toc_config.get('example_matches', [])}")
    if toc_config.get("notes"):
        print(f"  notes            : {toc_config['notes']}")

    while not _confirm("Accept these regex patterns?"):
        print("\nEdit patterns manually:")
        entry = input(f"  entry_pattern [{toc_config.get('entry_pattern')}]: ").strip()
        if entry:
            toc_config["entry_pattern"] = entry
        raw_subs = input(f"  sub_entry_patterns (comma-separated, leave blank to keep current): ").strip()
        if raw_subs:
            toc_config["sub_entry_patterns"] = [p.strip() for p in raw_subs.split(",")]
        print("\n--- Updated patterns ---")
        print(f"  entry_pattern    : {toc_config.get('entry_pattern')}")
        for i, p in enumerate(toc_config.get("sub_entry_patterns", [])):
            print(f"  sub_entry[{i}]     : {p}")

    # 4. Save
    out_path = os.path.join(run_dir, "toc_config.json")
    with open(out_path, "w") as f:
        json.dump(toc_config, f, indent=2)
    print(f"\nSaved → {out_path}")

    return toc_config


# ---------------------------------------------------------------------------
# Step 0b: Extract structured ToC using pdfplumber + approved patterns
# ---------------------------------------------------------------------------

def _compile_all_patterns(toc_config: dict) -> list[re.Pattern]:
    """Compile entry_pattern + sub_entry_patterns into a list of compiled regexes."""
    patterns = []
    ep = toc_config.get("entry_pattern", "")
    if ep:
        patterns.append(re.compile(ep))
    for p in toc_config.get("sub_entry_patterns", []):
        if p:
            patterns.append(re.compile(p))
    return patterns


def _extract_section_code(line: str, patterns: list[re.Pattern]) -> str | None:
    """Return the section code matched at the start of line, or None."""
    for pat in patterns:
        m = pat.match(line)
        if m:
            return m.group(0).strip()
    return None


def _parse_page_ref(line: str) -> int | None:
    """Extract trailing page number from a ToC line."""
    m = re.search(r"(\d+)\s*$", line)
    if m:
        return int(m.group(1))
    return None


def _normalise_code(code: str) -> str:
    """Convert a section code like 'Part 4.2' or '4.2.3' to underscore form '4_2' / '4_2_3'."""
    # Strip 'Part' prefix
    code = re.sub(r"^Part\s+", "", code, flags=re.IGNORECASE).strip()
    # Replace dots and brackets with underscores
    code = re.sub(r"[.()\s]+", "_", code).strip("_")
    return code


def step_0b(pdf_path: str, run_dir: str, toc_config: dict | None = None) -> list[dict]:
    """
    Extract structured ToC from PDF using regex patterns from toc_config.
    Writes toc.json. Returns list of ToC entry dicts.
    """
    print("\n" + "=" * 60)
    print("STEP 0b — ToC Extraction (pdfplumber)")
    print("=" * 60)

    if toc_config is None:
        config_path = os.path.join(run_dir, "toc_config.json")
        if not os.path.exists(config_path):
            logger.error("toc_config.json not found. Run step 0a first.")
            sys.exit(1)
        with open(config_path) as f:
            toc_config = json.load(f)

    toc_pages = toc_config.get("toc_pages", [])
    if not toc_pages:
        logger.error("No toc_pages in toc_config.json.")
        sys.exit(1)

    patterns = _compile_all_patterns(toc_config)
    if not patterns:
        logger.error("No regex patterns in toc_config.json.")
        sys.exit(1)

    lines = _extract_page_lines(pdf_path, toc_pages)
    entries: list[dict] = []

    for page_num, line in lines:
        code = _extract_section_code(line, patterns)
        if code is None:
            continue

        # Extract the title: everything after the code, before the page number
        remainder = line[len(code):].strip()
        page_ref = _parse_page_ref(remainder)
        title = re.sub(r"\s*\d+\s*$", "", remainder).strip(" .")

        if not title:
            continue

        normalised = _normalise_code(code)
        depth = normalised.count("_")  # rough depth from number of segments

        entries.append({
            "code": normalised,
            "raw_code": code,
            "title": title,
            "doc_page": page_ref,   # page number as printed in the document
            "pdf_page": None,       # actual PDF page index (computed after offset detection)
            "depth": depth,
        })

    print(f"\nExtracted {len(entries)} ToC entries.")
    for e in entries[:10]:
        print(f"  [{e['code']}] {e['title']} (doc p.{e['doc_page']})")
    if len(entries) > 10:
        print(f"  ... and {len(entries) - 10} more")

    # --- Page offset detection ---
    # ToC page numbers are document-internal (printed numbers).
    # PDF page indices may be offset by front matter (cover, ToC pages themselves, etc.).
    # Auto-detect: find a ToC entry with a page number, search for its code in the PDF,
    # then compute: pdf_page = doc_page + offset.
    offset = _detect_page_offset(pdf_path, entries, patterns)
    if offset is not None:
        print(f"\nDetected page offset: {offset:+d} (doc page + {offset} = PDF page index)")
        for e in entries:
            if e["doc_page"] is not None:
                e["pdf_page"] = e["doc_page"] + offset
    else:
        print("\nCould not auto-detect page offset — pdf_page will be None.")
        print("You can manually set 'page_offset' in toc_config.json and re-run step 0b.")

    out_path = os.path.join(run_dir, "toc.json")
    with open(out_path, "w") as f:
        json.dump(entries, f, indent=2)
    print(f"\nSaved → {out_path}")

    return entries


def _detect_page_offset(pdf_path: str, entries: list[dict], patterns: list[re.Pattern]) -> int | None:
    """
    Auto-detect the offset between ToC-printed page numbers and actual PDF page indices.

    Strategy: for each ToC entry that has a doc_page, search the PDF pages near that
    page number for text that starts with the entry's raw_code. The first successful
    match gives us: offset = actual_pdf_page - doc_page.
    """
    total_pages = _pdf_page_count(pdf_path)
    # Use entries that have a page reference, starting from deeper sections
    # (more distinctive codes, less likely to match ToC pages themselves)
    candidates = [e for e in entries if e.get("doc_page") and e.get("depth", 0) >= 1]
    # Try first 5 candidates
    for entry in candidates[:5]:
        doc_page = entry["doc_page"]
        search_code = entry.get("raw_code", "")
        if not search_code:
            continue
        # Search in a window of ±5 pages around the expected position
        search_range = range(
            max(1, doc_page - 5),
            min(total_pages + 1, doc_page + 6),
        )
        with pdfplumber.open(pdf_path) as pdf:
            for pdf_page_num in search_range:
                page = pdf.pages[pdf_page_num - 1]
                text = page.extract_text() or ""
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                for line in lines:
                    for pat in patterns:
                        m = pat.match(line)
                        if m and m.group(0).strip() == search_code:
                            offset = pdf_page_num - doc_page
                            return offset
    return None


# ---------------------------------------------------------------------------
# Step 0c: Classify ToC sections to business processes
# ---------------------------------------------------------------------------

def _format_toc_hierarchically(entries: list[dict]) -> str:
    """
    Format ToC entries with indentation that reflects their chapter grouping.

    Groups entries by their top-level segment (the part before the first '_').
    Within each group, the first entry is the chapter header (depth 0 or the
    lowest depth in the group); subsequent entries are indented as children.

    Example output:
        [8_1] Part A — ML/TF risk assessment (p.55)
          [8_2] AML/CTF risk awareness training program (p.57)
          [8_3] Employee due diligence program (p.59)
          ...
    """
    from collections import defaultdict

    # Group by leading segment (e.g. "4", "8", "CHAPTER")
    groups: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        code = e["code"]
        leading = code.split("_")[0]
        groups[leading].append(e)

    # Preserve original order of leading segments
    seen_leading: list[str] = []
    for e in entries:
        leading = e["code"].split("_")[0]
        if leading not in seen_leading:
            seen_leading.append(leading)

    lines = []
    for leading in seen_leading:
        group = groups[leading]
        min_depth = min(e["depth"] for e in group)
        for e in group:
            indent = "  " * (e["depth"] - min_depth)
            page = e.get("doc_page", "?")
            lines.append(f"{indent}[{e['code']}] {e['title']} (p.{page})")

    return "\n".join(lines)

def _load_process_forms_meta() -> dict[str, dict]:
    """
    Parse PROCESS_FORMS from architect.py using the AST (no exec).
    Returns {process_id: {"title": ..., "description": ...}}.
    """
    import ast

    architect_path = str(_PIPELINE_DIR / "architect.py")
    with open(architect_path) as f:
        source = f.read()

    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "PROCESS_FORMS":
                    process_forms = ast.literal_eval(node.value)
                    return {
                        pid: {
                            "title": fd["title"],
                            "description": fd.get("description", ""),
                        }
                        for pid, fd in process_forms.items()
                    }

    raise ValueError("PROCESS_FORMS not found in architect.py")


def _salvage_entries_from_truncated_json(raw: str) -> dict | None:
    """
    When the LLM response is truncated mid-JSON, try to extract the entries array
    by finding all complete {"code": ..., "title": ..., "process_id": ...} objects.
    Returns a minimal classification_raw dict, or None if nothing usable is found.
    """
    entry_pattern = re.compile(
        r'\{"code":\s*"([^"]+)",\s*"title":\s*"([^"]*)",\s*"process_id":\s*("([^"]*?)"|null)\}',
        re.DOTALL,
    )
    entries = []
    for m in entry_pattern.finditer(raw):
        code = m.group(1)
        title = m.group(2)
        pid_raw = m.group(3)
        process_id = None if pid_raw == "null" else m.group(4)
        entries.append({"code": code, "title": title, "process_id": process_id})

    if not entries:
        return None

    return {"entries": entries, "reasoning": "(salvaged from truncated response)"}


def step_0c(run_dir: str, toc_entries: list[dict] | None = None, process_meta: dict[str, dict] | None = None) -> dict:
    """
    Classify ToC sections to business processes using LLM.
    Shows result for human approval, then writes toc_classified.json.
    Returns classification dict.
    """
    print("\n" + "=" * 60)
    print("STEP 0c — ToC Classification (LLM)")
    print("=" * 60)

    if toc_entries is None:
        toc_path = os.path.join(run_dir, "toc.json")
        if not os.path.exists(toc_path):
            logger.error("toc.json not found. Run step 0b first.")
            sys.exit(1)
        with open(toc_path) as f:
            toc_entries = json.load(f)

    if process_meta is None:
        try:
            process_meta = _load_process_forms_meta()
        except Exception as e:
            logger.error(f"Failed to load process forms from architect.py: {e}")
            sys.exit(1)

    # Build prompt — hierarchical ToC grouped by top-level section
    toc_summary = _format_toc_hierarchically(toc_entries)
    processes_summary = "\n".join(
        f"  {pid}: {meta['title']}\n    → {meta['description']}"
        for pid, meta in process_meta.items()
    )

    print(f"\nSending {len(toc_entries)} ToC entries + {len(process_meta)} processes to LLM...")

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=8192,
        messages=[
            {
                "role": "user",
                "content": f"""You are classifying sections of a regulatory document's Table of Contents to business compliance processes.

## Business Processes
{processes_summary}

## Table of Contents (hierarchically grouped)
The ToC is shown below with sub-sections indented under their parent chapter/section.
Each line: [code] title (doc_page)

{toc_summary}

## Task
For EVERY ToC entry above, output a classification entry — either a process_id or null.

## Critical classification rules

1. **Chapter inheritance**: If you determine a chapter/top-level section belongs to a process, ALL its numbered sub-sections belong to that SAME process unless there is a strong reason to separate them. For example, if chapter 8 (Part A of the AML/CTF Program) maps to aml-ctf-program, then 8_1, 8_2, 8_3 ... 8_9 ALL map to aml-ctf-program.

2. **Sibling consistency**: Sections that share the same leading number (e.g. 8_1 through 8_9, or 9_1 through 9_9) are sub-sections of the same chapter and should almost always map to the same process. Do not classify siblings differently unless the titles clearly indicate different domains.

3. **Top-level preference**: Where a parent section is already mapped, you do NOT need to re-map every child individually — but you MUST still output an entry for every code in the ToC (with the same process_id or null).

4. **Null is appropriate** for: instrument-level sections (names, definitions), exemptions, reporting/registration procedural chapters, and topics clearly outside the listed business processes.

Return a JSON object containing ALL {len(toc_entries)} ToC entries:
{{
  "entries": [
    {{"code": "4_2", "title": "...", "process_id": "cdd-individuals"}},
    {{"code": "8_1", "title": "...", "process_id": "aml-ctf-program"}},
    {{"code": "8_2", "title": "...", "process_id": "aml-ctf-program"}},
    {{"code": "1_1", "title": "...", "process_id": null}},
    ...
  ],
  "reasoning": "Brief explanation of key classification decisions"
}}

Return ONLY valid JSON. Every code from the ToC must appear exactly once in entries.""",
            }
        ],
    )

    raw_json = response.content[0].text.strip()
    raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json)
    raw_json = re.sub(r"\s*```$", "", raw_json)

    try:
        classification_raw = json.loads(raw_json)
    except json.JSONDecodeError as e:
        # Response may be truncated (hit max_tokens). Try to salvage the entries array.
        logger.warning(f"JSON parse failed ({e}) — attempting to salvage entries array from truncated response.")
        classification_raw = _salvage_entries_from_truncated_json(raw_json)
        if classification_raw is None:
            logger.error(f"Could not salvage entries. Raw response:\n{raw_json}")
            sys.exit(1)
        logger.info(f"Salvaged {len(classification_raw.get('entries', []))} entries from truncated JSON.")

    # Build process_to_sections index
    process_to_sections: dict[str, list[str]] = {pid: [] for pid in process_meta}
    entries = classification_raw.get("entries", [])

    for entry in entries:
        pid = entry.get("process_id")
        code = entry.get("code")
        if pid and code and pid in process_to_sections:
            process_to_sections[pid].append(code)

    # Remove processes with no sections
    process_to_sections = {k: v for k, v in process_to_sections.items() if v}

    result = {
        "entries": entries,
        "process_to_sections": process_to_sections,
        "reasoning": classification_raw.get("reasoning", ""),
    }

    # Human review
    print("\n--- LLM Classification Result ---")
    if result.get("reasoning"):
        print(f"\nReasoning: {result['reasoning']}\n")
    print("Process → Sections mapping:")
    for pid, sections in process_to_sections.items():
        title = process_meta.get(pid, {}).get("title", pid)
        print(f"  {pid} ({title}): {sections}")

    unmapped = [e for e in entries if not e.get("process_id")]
    if unmapped:
        print(f"\nUnmapped sections ({len(unmapped)}):")
        for e in unmapped:
            print(f"  [{e['code']}] {e['title']}")

    while not _confirm("Approve this classification and save toc_classified.json?"):
        print("\nYou can edit toc_classified.json manually after this run, or:")
        action = input("  r = re-run LLM classification, q = quit: ").strip().lower()
        if action == "r":
            return step_0c(run_dir, toc_entries, process_meta)
        elif action == "q":
            print("Aborted.")
            sys.exit(0)

    out_path = os.path.join(run_dir, "toc_classified.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved → {out_path}")

    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_all(pdf_path: str, run_dir: str):
    os.makedirs(run_dir, exist_ok=True)
    toc_config = step_0a(pdf_path, run_dir)
    toc_entries = step_0b(pdf_path, run_dir, toc_config)
    step_0c(run_dir, toc_entries)
    print("\n✓ Step 0 complete. toc_classified.json is ready for the architect pipeline.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract and classify PDF Table of Contents.")
    parser.add_argument("pdf", help="Path to the PDF file")
    parser.add_argument("run_dir", help="Run directory (e.g. runs/1)")
    parser.add_argument(
        "--step",
        choices=["0a", "0b", "0c"],
        help="Run only a specific sub-step (default: all)",
    )
    args = parser.parse_args()

    pdf_path = os.path.abspath(args.pdf)
    run_dir = os.path.abspath(args.run_dir)

    if not os.path.exists(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    os.makedirs(run_dir, exist_ok=True)

    if args.step == "0a":
        step_0a(pdf_path, run_dir)
    elif args.step == "0b":
        step_0b(pdf_path, run_dir)
    elif args.step == "0c":
        step_0c(run_dir)
    else:
        run_all(pdf_path, run_dir)
