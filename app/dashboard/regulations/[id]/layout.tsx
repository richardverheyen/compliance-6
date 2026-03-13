"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { PdfPanelContext, type PdfDocument } from "./_context";

// PDF.js viewer hosted in public/pdfjs/web/viewer.html
// pagemode=none suppresses the sidebar on load
function viewerSrc(pdfUrl: string): string {
  return `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}#pagemode=none`;
}

export default function RegulationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [activeDocument, setActiveDocumentState] = useState<PdfDocument | null>(null);
  const [pdfVisible, setPdfVisible] = useState(false);
  const pdfVisibleRef = useRef(false);
  const activeDocumentRef = useRef<PdfDocument | null>(null);
  // One iframe element per document URL — never unmounted, so the browser
  // preserves each PDF viewer's scroll position across tab switches.
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  // Proxy so all existing iframeRef.current call sites work unchanged.
  // Always resolves to the currently active document's iframe element.
  const iframeRef = {
    get current(): HTMLIFrameElement | null {
      const url = activeDocumentRef.current?.url;
      return url ? (iframeRefs.current[url] ?? null) : null;
    },
  } as React.RefObject<HTMLIFrameElement>;

  useEffect(() => {
    fetch(`/api/compliance/regulations/${id}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((mf) => {
        if (!mf) return;
        if (mf.documents?.length) {
          setDocuments(mf.documents);
          setActiveDocumentState(mf.documents[0]);
          activeDocumentRef.current = mf.documents[0];
        } else if (mf.pdfUrl) {
          const primary = { label: "Source Document", url: mf.pdfUrl };
          setDocuments([primary]);
          setActiveDocumentState(primary);
          activeDocumentRef.current = primary;
        }
        if (mf.pdfUrl) setPdfUrl(mf.pdfUrl);
      });
  }, [id]);

  // Reset to hidden on every route change within this layout
  useEffect(() => {
    setPdfVisible(false);
  }, [pathname]);

  const togglePdf = useCallback(() => setPdfVisible((v) => !v), []);

  // Keep refs in sync so callbacks don't capture stale values.
  useEffect(() => { pdfVisibleRef.current = pdfVisible; }, [pdfVisible]);

  const setActiveDocument = useCallback((doc: PdfDocument) => {
    setActiveDocumentState(doc);
    activeDocumentRef.current = doc;
  }, []);

  const navigateToPdfDestination = useCallback((ruleCode: string) => {
    const wasVisible = pdfVisibleRef.current;
    setPdfVisible(true);

    // Switch to primary document (named destinations only exist there)
    const primaryDoc = documents[0] ?? null;
    const isSwitchingDoc = primaryDoc !== null && activeDocumentRef.current?.url !== primaryDoc.url;
    if (isSwitchingDoc) {
      setActiveDocumentState(primaryDoc);
      activeDocumentRef.current = primaryDoc;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getApp = () => (iframeRef.current?.contentWindow as any)?.PDFViewerApplication;

    const doNavigate = async (): Promise<boolean> => {
      const app = getApp();
      if (!app?.initialized || !app?.pdfDocument) return false;

      // Remove stale highlight immediately so it doesn't linger while we navigate
      iframeRef.current?.contentWindow?.document.getElementById("rule-hl")?.remove();

      // 1. Resolve named destination → [pageRef, {name:'XYZ'}, pdfX, pdfY, zoom]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let destArray: any[];
      try {
        destArray = await app.pdfDocument.getDestination(ruleCode);
      } catch {
        return false;
      }
      if (!Array.isArray(destArray) || destArray.length < 2) return false;

      const pageIndex: number = await app.pdfDocument.getPageIndex(destArray[0]);
      const pdfPageView = app.pdfViewer._pages[pageIndex];
      if (!pdfPageView) return false;

      // Ensure pages have been laid out before computing scroll positions.
      // app.initialized can become true before PDF.js finishes sizing all page
      // divs; scrollHeight > clientHeight confirms the container is scrollable.
      const container: HTMLElement = app.pdfViewer.container;
      if (!pdfPageView.div || pdfPageView.div.getBoundingClientRect().height === 0) return false;
      if (app.pdfDocument.numPages > 1 && container.scrollHeight <= container.clientHeight) return false;

      const pageDiv = pdfPageView.div as HTMLDivElement;

      // 2. Compute the final centred scroll target in one step — no intermediate
      //    jump. getBoundingClientRect gives the page's current on-screen position
      //    relative to the container, from which we derive the absolute offset.
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageDiv.getBoundingClientRect();
      const pageTopInContainer = pageRect.top - containerRect.top + container.scrollTop;

      const destX: number = destArray[2] ?? 0;
      const destY: number = destArray[3] ?? 0;
      let destYinPage = 0;
      if (pdfPageView.viewport) {
        const [, vy] = pdfPageView.viewport.convertToViewportPoint(destX, destY);
        destYinPage = vy;
      }

      // Single smooth scroll — eliminates the double-jump flash
      const targetScrollTop = Math.max(0, pageTopInContainer + destYinPage - container.clientHeight / 2);
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" });

      // 3. Draw a highlight rectangle around the rule code text (best-effort).
      //    The highlight is position:absolute inside pageDiv so it stays correct
      //    regardless of where the smooth scroll has reached.
      try {
        const vp = pdfPageView.viewport;
        const doc = iframeRef.current!.contentWindow!.document;

        // Search the page's text content for the exact rule code item so we
        // can use its precise bounding box rather than estimating from the
        // named destination coordinates (which have padding baked in).
        const pdfPage = await app.pdfDocument.getPage(pageIndex + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textContent = await pdfPage.getTextContent();

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

        if (bestItem && vp) {
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
        } else if (vp) {
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
        } else {
          return true; // viewport not ready, skip highlight (scroll already dispatched)
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
      } catch {
        // Highlight is best-effort; silently ignore failures
      }

      return true;
    };

    const attemptNavigate = () => {
      doNavigate().then((ready) => {
        if (!ready) {
          const interval = setInterval(() => {
            doNavigate().then((done) => { if (done) clearInterval(interval); });
          }, 100);
          setTimeout(() => clearInterval(interval), 10_000);
        }
      });
    };

    // Only delay for the panel open animation — doc switches no longer require
    // a remount wait since each iframe stays mounted with display:none.
    if (!wasVisible) {
      setTimeout(attemptNavigate, 520);
    } else {
      attemptNavigate();
    }
  // documents[0] is stable after mount; including documents causes unnecessary re-creation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const hasDocuments = documents.length > 0;

  return (
    <PdfPanelContext.Provider value={{ pdfVisible, togglePdf, pdfUrl, documents, activeDocument, setActiveDocument, navigateToPdfDestination }}>
      {/*
        Two-column flex row. Content scrolls with the page normally.
        PDF panel is sticky to the viewport top so it always fills the screen
        without competing with the page scrollbar.
      */}
      <div className="flex items-start">
        {/* Content — scrolls with the page */}
        <div className="flex-1 min-w-0 px-4 py-12">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>

        {/* PDF panel — sticky viewport-height column, animated width */}
        {hasDocuments && (
          <div
            className="hidden lg:flex flex-col shrink-0 sticky top-0 overflow-hidden"
            style={{
              height: "100vh",
              width: pdfVisible ? "38vw" : "0",
              opacity: pdfVisible ? 1 : 0,
              transition: "width 500ms ease-in-out, opacity 300ms ease-in-out",
            }}
          >
            {/* Document switcher tabs — only shown when there are multiple docs */}
            {documents.length > 1 && (
              <div className="flex shrink-0 border-b border-gray-200 bg-white overflow-x-auto">
                {documents.map((doc) => {
                  const isActive = activeDocument?.url === doc.url;
                  return (
                    <button
                      key={doc.url}
                      type="button"
                      onClick={() => setActiveDocument(doc)}
                      className={[
                        "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                        isActive
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                      ].join(" ")}
                    >
                      {doc.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/*
              One iframe per document, all kept mounted. Inactive ones are hidden
              with display:none so the browser preserves their internal scroll
              state — no save/restore needed when switching tabs.
            */}
            {documents.map((doc) => (
              <iframe
                key={doc.url}
                ref={(el) => { iframeRefs.current[doc.url] = el; }}
                src={viewerSrc(doc.url)}
                title={doc.label}
                className={[
                  "w-full border-l border-gray-200 bg-gray-50",
                  doc.url === activeDocument?.url ? "flex flex-1" : "hidden",
                ].join(" ")}
              />
            ))}
          </div>
        )}
      </div>
    </PdfPanelContext.Provider>
  );
}
