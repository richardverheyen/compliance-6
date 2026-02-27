"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { PdfPanelContext } from "./_context";

// PDF.js viewer hosted in public/pdfjs/web/viewer.html
// pagemode=none suppresses the sidebar on load
function viewerSrc(pdfUrl: string): string {
  return `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}#pagemode=none`;
}

export default function RegulationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const isProcessView = pathname.includes("/processes/");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfVisible, setPdfVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`/api/compliance/regulations/${id}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((mf) => { if (mf?.pdfUrl) setPdfUrl(mf.pdfUrl); });
  }, [id]);

  // Reset to hidden on every route change within this layout
  useEffect(() => {
    setPdfVisible(false);
  }, [pathname]);

  const togglePdf = useCallback(() => setPdfVisible((v) => !v), []);

  const navigateToPdfDestination = useCallback((ruleCode: string) => {
    setPdfVisible(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getApp = () => (iframeRef.current?.contentWindow as any)?.PDFViewerApplication;

    const doNavigate = async (): Promise<boolean> => {
      const app = getApp();
      if (!app?.initialized) return false;

      // Remove stale highlight immediately so it doesn't linger while we navigate
      iframeRef.current?.contentWindow?.document.getElementById("rule-hl")?.remove();

      // 1. Jump to named destination
      await app.pdfLinkService.goToDestination(ruleCode);

      // 2. Wait for PDF.js scroll to settle, then vertically centre the destination
      await new Promise<void>((r) => setTimeout(r, 120));
      const container: HTMLElement = app.pdfViewer.container;
      container.scrollTop = Math.max(0, container.scrollTop - container.clientHeight / 2);

      // 3. Draw a highlight rectangle around the rule code text (best-effort)
      try {
        // Resolve named destination → [pageRef, {name:'XYZ'}, pdfX, pdfY, zoom]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const destArray: any[] = await app.pdfDocument.getDestination(ruleCode);
        if (Array.isArray(destArray) && destArray.length >= 2) {
          const pageIndex: number = await app.pdfDocument.getPageIndex(destArray[0]);
          const pdfPageView = app.pdfViewer._pages[pageIndex];

          if (pdfPageView) {
            const vp = pdfPageView.viewport;
            const pageDiv = pdfPageView.div as HTMLDivElement;
            const doc = iframeRef.current!.contentWindow!.document;

            // Search the page's text content for the exact rule code item so we
            // can use its precise bounding box rather than estimating from the
            // named destination coordinates (which have padding baked in).
            const pdfPage = await app.pdfDocument.getPage(pageIndex + 1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textContent = await pdfPage.getTextContent();

            const destX: number = destArray[2] ?? 0;
            const destY: number = destArray[3] ?? 0;

            // For indented rules like "4.2.7(3)" the PDF only shows the
            // sub-item suffix "(3)" in the visible text, so extract it for
            // use as a fallback match pattern.
            const subItemMatch = ruleCode.match(/(\([^)]+\))$/);
            const subItemCode: string | null = subItemMatch ? subItemMatch[1] : null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let bestItem: any = null;
            let bestDist = Infinity;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const item of textContent.items as any[]) {
              const s: string = (item.str ?? "").trim();
              if (!s) continue;
              // Match the rule code exactly, or when it appears with trailing
              // space, paren, or dash (e.g. the rule code is part of a run).
              // Also match the sub-item suffix alone (e.g. "(3)") since
              // indented rules show only the suffix in the PDF text.
              const matches =
                s === ruleCode ||
                s.startsWith(ruleCode + " ") ||
                s.startsWith(ruleCode + "(") ||
                s.startsWith(ruleCode + "\u2014") ||
                s.startsWith(ruleCode + "\u2013") ||
                (subItemCode !== null && (
                  s === subItemCode ||
                  s.startsWith(subItemCode + " ") ||
                  s.startsWith(subItemCode + "\u2014") ||
                  s.startsWith(subItemCode + "\u2013")
                ));
              if (!matches) continue;
              // Prefer the item closest (in PDF space) to the named destination
              const dy = Math.abs(item.transform[5] - destY);
              const dx = Math.abs(item.transform[4] - destX);
              const dist = dy * 3 + dx;
              if (dist < bestDist) { bestDist = dist; bestItem = item; }
            }

            let hlLeft: number, hlTop: number, hlWidth: number, hlHeight: number;

            if (bestItem) {
              // Exact bounds: transform[4/5] = PDF (x, baseline-y), width/height in user space
              const tx: number = bestItem.transform[4];
              const ty: number = bestItem.transform[5]; // baseline
              const iw: number = bestItem.width;
              const ih: number = bestItem.height || Math.abs(bestItem.transform[3]);
              // PDF y increases upward; viewport y increases downward.
              // (tx, ty)      → bottom-left of glyph box in CSS
              // (tx+iw, ty+ih) → top-right of glyph box in CSS
              const [vx1, vy1] = vp.convertToViewportPoint(tx,      ty);
              const [vx2, vy2] = vp.convertToViewportPoint(tx + iw, ty + ih);
              hlLeft   = Math.min(vx1, vx2) - 2;
              hlTop    = Math.min(vy1, vy2) - 2;
              // If the text item contains more than just the rule code (e.g.
              // the marker is followed by paragraph text in the same run),
              // proportion the width down to cover only the code's characters.
              const matchStr = (bestItem.str ?? "").trim();
              const displayCode = matchStr.startsWith(ruleCode)
                ? ruleCode
                : (subItemCode && matchStr.startsWith(subItemCode) ? subItemCode : matchStr);
              const wFrac = matchStr.length > displayCode.length
                ? displayCode.length / matchStr.length : 1;
              hlWidth  = Math.abs(vx2 - vx1) * wFrac + 4;
              hlHeight = Math.abs(vy2 - vy1) + 4;
            } else {
              // Fallback: use destination coords with a rough rule-code size estimate.
              // destY is the PDF y of the viewport top, which add_destinations.py sets
              // to TOP_PADDING (10 pts) above the text top. convertToViewportPoint
              // therefore gives a CSS y that is (10 * scale) px above the text top,
              // so we shift down by that amount to align the highlight with the text.
              const [sx, sy] = vp.convertToViewportPoint(destX, destY);
              const lineH   = Math.ceil(12 * vp.scale);
              const topPad  = Math.ceil(10 * vp.scale); // matches TOP_PADDING in add_destinations.py
              hlLeft   = Math.floor(sx) - 2;
              hlTop    = Math.floor(sy) + topPad - 2;
              hlWidth  = Math.ceil(35 * vp.scale) + 4;
              hlHeight = lineH + 4;
            }

            const hl = doc.createElement("div");
            hl.id = "rule-hl";
            hl.style.cssText = [
              "position:absolute",
              `left:${hlLeft}px`,
              `top:${hlTop}px`,
              `width:${hlWidth}px`,
              `height:${hlHeight}px`,
              "border:2px solid #f59e0b",
              "background:rgba(245,158,11,0.10)",
              "border-radius:3px",
              "pointer-events:none",
              "z-index:5",
            ].join(";");
            pageDiv.appendChild(hl);
          }
        }
      } catch {
        // Highlight is best-effort; silently ignore failures
      }

      return true;
    };

    doNavigate().then((ready) => {
      if (!ready) {
        const interval = setInterval(() => {
          doNavigate().then((done) => { if (done) clearInterval(interval); });
        }, 100);
        setTimeout(() => clearInterval(interval), 10_000);
      }
    });
  }, []);

  return (
    <PdfPanelContext.Provider value={{ pdfVisible, togglePdf, pdfUrl, navigateToPdfDestination }}>
      {/*
        Full-height flex row: the nav is h-16 (4rem), so we take the rest.
        Content column scrolls independently; PDF panel fills 100% height.
      */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Content — scrolls normally */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-12">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>

        {/* PDF panel — full height, animated width */}
        {pdfUrl && (
          <div
            className="hidden lg:block shrink-0 overflow-hidden"
            style={{
              width: pdfVisible ? "38vw" : "0",
              opacity: pdfVisible ? 1 : 0,
              transition: "width 500ms ease-in-out, opacity 300ms ease-in-out",
            }}
          >
            <iframe
              ref={iframeRef}
              src={viewerSrc(pdfUrl)}
              title="Regulation Source Document"
              className="h-full w-full border-l border-gray-200 bg-gray-50"
            />
          </div>
        )}
      </div>
    </PdfPanelContext.Provider>
  );
}
