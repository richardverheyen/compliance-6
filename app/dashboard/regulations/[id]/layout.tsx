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
  const [pdfVisible, setPdfVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`/api/compliance/regulations/${id}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((mf) => { if (mf?.pdfUrl) setPdfUrl(mf.pdfUrl); });
  }, [id]);

  useEffect(() => {
    setPdfVisible(!isProcessView);
  }, [isProcessView]);

  const togglePdf = useCallback(() => setPdfVisible((v) => !v), []);

  const navigateToPdfDestination = useCallback((ruleCode: string) => {
    setPdfVisible(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getApp = () => (iframeRef.current?.contentWindow as any)?.PDFViewerApplication;

    const doNavigate = async (): Promise<boolean> => {
      const app = getApp();
      if (!app?.initialized) return false;

      // 1. Jump to named destination
      await app.pdfLinkService.goToDestination(ruleCode);

      // 2. Wait for PDF.js scroll to settle, then vertically centre the destination
      await new Promise<void>((r) => setTimeout(r, 120));
      const container: HTMLElement = app.pdfViewer.container;
      container.scrollTop = Math.max(0, container.scrollTop - container.clientHeight / 2);

      // 3. Draw a highlight rectangle around the destination (best-effort)
      try {
        // Resolve named destination → [pageRef, {name:'XYZ'}, pdfX, pdfY, zoom]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const destArray: any[] = await app.pdfDocument.getDestination(ruleCode);
        if (Array.isArray(destArray) && destArray.length >= 4) {
          const pageIndex: number = await app.pdfDocument.getPageIndex(destArray[0]);
          const pdfPageView = app.pdfViewer._pages[pageIndex];

          if (pdfPageView) {
            // Convert PDF coordinate space (origin bottom-left) → CSS pixels within page div
            const vp = pdfPageView.viewport;
            const [sx, sy] = vp.convertToViewportPoint(
              destArray[2] ?? 0,
              destArray[3] ?? 0,
            );
            // Approximate one-line height at current zoom (14 pt scaled)
            const lineH = Math.ceil(14 * vp.scale);
            const pageDiv = pdfPageView.div as HTMLDivElement;

            const doc = iframeRef.current!.contentWindow!.document;
            // Remove any previous highlight
            doc.getElementById("rule-hl")?.remove();

            const hl = doc.createElement("div");
            hl.id = "rule-hl";
            hl.style.cssText = [
              "position:absolute",
              `left:${Math.floor(sx)}px`,
              `top:${Math.floor(sy) - 2}px`,
              `width:${pageDiv.clientWidth - Math.floor(sx) - 12}px`,
              `height:${lineH + 4}px`,
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
        // Highlight is best-effort; silently ignore coordinate resolution failures
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
          {children}
        </div>

        {/* PDF panel — full height, animated width */}
        {pdfUrl && (
          <div
            className="hidden lg:block shrink-0 overflow-hidden"
            style={{
              width: pdfVisible ? "45vw" : "0",
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
