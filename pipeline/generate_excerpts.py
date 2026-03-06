#!/usr/bin/env python3
"""
Generate PDF excerpt snippets for each rule node in runs/1/nodes.json.

For each node that has a rule_code, this script:
1. Locates the text on the PDF page using pdfplumber (for precise y-coordinate)
2. Crops a ~150pt tall band of the page around that text using PyMuPDF
3. Saves a single-page PDF to runs/1/excerpts/<uid>.pdf

These excerpt files are loaded by viewer.html in the rule hover modal.

Usage:
    python generate_excerpts.py [--input chapter4.pdf] [--nodes runs/1/nodes.json]
                                [--out-dir runs/1/excerpts] [--height 150]
"""

import argparse
import json
import os
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

NODES_PATH = "runs/1/nodes.json"
INPUT_PDF = "chapter4.pdf"
OUT_DIR = "runs/1/excerpts"
SNIPPET_HEIGHT = 150.0  # points of PDF page to capture per excerpt
PADDING_TOP = 20.0      # points above the matched text line
PADDING_BOTTOM = 130.0  # points below the matched text line (for multi-line rules)


def find_text_top(page, node_text: str, x_indent: float, min_top: float = 0.0) -> float | None:
    """
    Use pdfplumber to find the top y-coordinate (from page top) of node_text.
    Returns pdfplumber 'top' value, or None if not found.
    """
    snippet = node_text[:40].split("\n")[0].strip()
    if not snippet:
        return None

    results = page.search(snippet, regex=False)
    if not results:
        snippet = node_text[:20].split("\n")[0].strip()
        results = page.search(snippet, regex=False)
    if not results:
        return None

    candidates = [r for r in results if r["top"] >= min_top]
    if not candidates:
        candidates = results

    best = min(candidates, key=lambda r: abs(r["x0"] - x_indent))
    return best["top"]


def extract_excerpt(fitz_page, text_top_pt: float, page_height_pt: float) -> fitz.Rect:
    """
    Build a crop rectangle in PyMuPDF coordinates (origin bottom-left).
    pdfplumber 'top' is from page top; fitz uses bottom-left origin.
    """
    # Convert pdfplumber top → fitz y (from bottom)
    fitz_y_top = page_height_pt - text_top_pt
    # Crop: from (y_top + padding_top) down to (y_top - padding_bottom)
    # In fitz coords: y0 < y1 means top < bottom, but fitz Rect is (x0, y0, x1, y1)
    # where y0 is top and y1 is bottom in *page coordinate space* (y increases downward in fitz)
    # Actually fitz.Rect(x0, y0, x1, y1): y0=top of rect, y1=bottom, increasing downward
    rect_y0 = text_top_pt - PADDING_TOP
    rect_y1 = text_top_pt + PADDING_BOTTOM
    rect_y0 = max(0.0, rect_y0)
    rect_y1 = min(page_height_pt, rect_y1)
    page_width = fitz_page.rect.width
    return fitz.Rect(0, rect_y0, page_width, rect_y1)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default=INPUT_PDF, help="Source PDF file")
    parser.add_argument("--nodes", default=NODES_PATH, help="nodes.json path")
    parser.add_argument("--out-dir", default=OUT_DIR, help="Output directory for excerpt PDFs")
    parser.add_argument("--height", type=float, default=SNIPPET_HEIGHT, help="Snippet height in points")
    args = parser.parse_args()

    with open(args.nodes) as f:
        nodes = json.load(f)

    rule_nodes = [n for n in nodes if n.get("rule_code") and n.get("uid")]
    print(f"Processing {len(rule_nodes)} rule nodes from {args.nodes}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(args.input)
    page_count = doc.page_count
    print(f"PDF: {args.input} ({page_count} pages)")

    # Sort by (page, x_indent) to process in document order so min_top works
    rule_nodes_sorted = sorted(rule_nodes, key=lambda n: (n.get("page", 1), n.get("x_indent", 0)))

    # Track last matched top per page to avoid re-using same text position for two nodes
    page_last_top: dict[int, float] = {}

    hit = 0
    miss = 0

    with pdfplumber.open(args.input) as plumber_pdf:
        for node in rule_nodes_sorted:
            uid = node["uid"]
            out_path = out_dir / f"{uid}.pdf"

            if out_path.exists():
                hit += 1
                continue  # already generated; skip

            page_0idx = node.get("page", 1) - 1
            if page_0idx < 0 or page_0idx >= page_count:
                miss += 1
                continue

            plumber_page = plumber_pdf.pages[page_0idx]
            page_height = float(plumber_page.height)
            min_top = page_last_top.get(page_0idx, 0.0)

            text_top = find_text_top(plumber_page, node["text"], node.get("x_indent", 0), min_top)

            fitz_page = doc[page_0idx]

            if text_top is not None:
                page_last_top[page_0idx] = text_top
                crop_rect = extract_excerpt(fitz_page, text_top, page_height)
            else:
                # Fallback: top portion of page
                miss += 1
                crop_rect = fitz.Rect(0, 0, fitz_page.rect.width, min(SNIPPET_HEIGHT, page_height))

            # Create a new single-page PDF with the cropped region
            new_doc = fitz.open()
            new_page = new_doc.new_page(width=crop_rect.width, height=crop_rect.height)
            new_page.show_pdf_page(new_page.rect, doc, page_0idx, clip=crop_rect)
            new_doc.save(str(out_path), garbage=4, deflate=True)
            new_doc.close()
            hit += 1

    doc.close()
    print(f"\nDone: {hit} excerpts saved to {out_dir}/")
    if miss:
        print(f"  ({miss} used page-top fallback due to text not found)")


if __name__ == "__main__":
    main()
