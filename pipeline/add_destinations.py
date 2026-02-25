#!/usr/bin/env python3
"""
Add named destinations to chapter4.pdf based on rule_codes in nodes.json.

Each RULE node gets a named destination keyed by its rule_code, pointing to
the exact page and y-position of the rule text.

Output: chapter4_linked.pdf

Usage:
    python add_destinations.py [--input chapter4.pdf] [--output chapter4_linked.pdf]

URL hash navigation (in browser PDF viewer):
    chapter4_linked.pdf#nameddest=4.1.1
    chapter4_linked.pdf#nameddest=4.1.2(1)
"""

import argparse
import json
import re
import sys
import pdfplumber
import pymupdf as fitz

NODES_PATH = "runs/1/nodes.json"
INPUT_PDF = "chapter4.pdf"
OUTPUT_PDF = "chapter4_linked.pdf"
# Padding above each rule line so it's not flush with the top of the viewport
TOP_PADDING = 10.0


def find_y_for_node(page, node_text: str, x_indent: float, page_height: float) -> float | None:
    """
    Search the pdfplumber page for the start of node_text and return
    the PDF y-coordinate (bottom-left origin) of the first match.
    Falls back to None if not found.
    """
    # Use first 40 chars, stopping at any newline, to stay within a single line
    snippet = node_text[:40].split("\n")[0].strip()
    if not snippet:
        return None

    results = page.search(snippet, regex=False)
    if not results:
        # Retry with shorter snippet (first 20 chars)
        snippet = node_text[:20].split("\n")[0].strip()
        results = page.search(snippet, regex=False)

    if not results:
        return None

    # If multiple hits, pick the one whose x0 is closest to x_indent
    best = min(results, key=lambda r: abs(r["x0"] - x_indent))
    # Convert pdfplumber top (from page top) → PDF y (from page bottom)
    pdf_y = page_height - best["top"] + TOP_PADDING
    return pdf_y


def escape_pdf_string(s: str) -> str:
    """Escape a string for use inside PDF literal string ( )."""
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_names_array(destinations: list[tuple[str, int, float, float]], page_xrefs: list[int]) -> str:
    """
    Build the PDF Names array string for a /Dests name tree.
    Entries must be sorted lexicographically by name for PDF binary search.
    Format: (name) [page_ref 0 R /XYZ x y zoom] ...
    """
    sorted_dests = sorted(destinations, key=lambda d: d[0])
    parts = []
    for name, page_0idx, x, pdf_y in sorted_dests:
        page_xref = page_xrefs[page_0idx]
        escaped = escape_pdf_string(name)
        parts.append(f"({escaped}) [{page_xref} 0 R /XYZ {x:.2f} {pdf_y:.2f} 0]")
    return " ".join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default=INPUT_PDF)
    parser.add_argument("--output", default=OUTPUT_PDF)
    parser.add_argument("--nodes", default=NODES_PATH)
    args = parser.parse_args()

    with open(args.nodes) as f:
        nodes = json.load(f)

    rule_nodes = [n for n in nodes if n.get("rule_code")]
    print(f"Found {len(rule_nodes)} rule nodes")

    # --- Step 1: find y-coordinates via pdfplumber ---
    destinations: list[tuple[str, int, float, float]] = []  # (rule_code, page_0idx, x, pdf_y)
    misses: list[dict] = []

    with pdfplumber.open(args.input) as pdf:
        for node in rule_nodes:
            page_0idx = node["page"] - 1
            page = pdf.pages[page_0idx]
            page_height = float(page.height)

            pdf_y = find_y_for_node(page, node["text"], node.get("x_indent", 0), page_height)

            if pdf_y is not None:
                destinations.append((node["rule_code"], page_0idx, node.get("x_indent", 0), pdf_y))
            else:
                # Fallback: top of page
                destinations.append((node["rule_code"], page_0idx, 0.0, page_height))
                misses.append({"rule_code": node["rule_code"], "page": node["page"], "text": node["text"][:60]})

    print(f"Located: {len(destinations) - len(misses)}  |  Fallback (page-top): {len(misses)}")
    if misses:
        print("Fallback nodes:")
        for m in misses:
            print(f"  [{m['rule_code']}] p{m['page']} — {m['text']!r}")

    # --- Step 2: inject named destinations into PDF via PyMuPDF ---
    doc = fitz.open(args.input)
    page_xrefs = [doc[i].xref for i in range(doc.page_count)]

    names_array = build_names_array(destinations, page_xrefs)
    dests_dict = f"<< /Names [{names_array}] >>"

    catalog_xref = doc.pdf_catalog()
    existing_names = doc.xref_get_key(catalog_xref, "Names")

    if existing_names[0] == "null":
        # No Names dict yet — create one
        doc.xref_set_key(catalog_xref, "Names", f"<< /Dests {dests_dict} >>")
    else:
        # Names dict exists — add/replace the Dests entry
        # xref_get_key returns (type, value); for indirect refs resolve to xref
        if existing_names[0] == "xref":
            names_xref = int(existing_names[1].split()[0])
            doc.xref_set_key(names_xref, "Dests", dests_dict)
        else:
            # Inline dict — overwrite the whole Names entry
            doc.xref_set_key(catalog_xref, "Names", f"<< /Dests {dests_dict} >>")

    doc.save(args.output, garbage=4, deflate=True)
    print(f"\nSaved {args.output} with {len(destinations)} named destinations")
    print(f"\nExample URL:")
    if destinations:
        sample = destinations[0][0]
        import urllib.parse
        print(f"  {args.output}#nameddest={urllib.parse.quote(sample)}")


if __name__ == "__main__":
    main()
