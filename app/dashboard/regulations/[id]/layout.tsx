"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { PdfPanelContext } from "./_context";

// PDF.js viewer hosted in public/pdfjs/web/viewer.html
// Parameters:
//   file=<encoded PDF URL>  — which PDF to load
//   pagemode=none           — hide the sidebar on load

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

  // Fetch manifest once to get pdfUrl
  useEffect(() => {
    fetch(`/api/compliance/regulations/${id}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((mf) => {
        if (mf?.pdfUrl) setPdfUrl(mf.pdfUrl);
      });
  }, [id]);

  // Auto-collapse PDF when entering a process view; auto-expand on overview.
  useEffect(() => {
    if (isProcessView) {
      setPdfVisible(false);
    } else {
      setPdfVisible(true);
    }
  }, [isProcessView]);

  const togglePdf = useCallback(() => setPdfVisible((v) => !v), []);

  // Navigate to a named destination inside the already-loaded PDF.js viewer
  // without touching the iframe src (zero-reload).
  const navigateToPdfDestination = useCallback((ruleCode: string) => {
    setPdfVisible(true);

    const tryNavigate = () => {
      const app =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (iframeRef.current?.contentWindow as any)?.PDFViewerApplication;
      if (app?.initialized) {
        app.pdfLinkService.navigateTo(ruleCode);
        return true;
      }
      return false;
    };

    // If viewer is already loaded, navigate immediately; otherwise poll until ready.
    if (!tryNavigate()) {
      const interval = setInterval(() => {
        if (tryNavigate()) clearInterval(interval);
      }, 100);
      // Give up after 10 s to avoid leaking the interval
      setTimeout(() => clearInterval(interval), 10_000);
    }
  }, []);

  return (
    <PdfPanelContext.Provider value={{ pdfVisible, togglePdf, pdfUrl, navigateToPdfDestination }}>
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start">
            {/* Main content */}
            <div className="min-w-0 flex-1">{children}</div>

            {/* Persistent PDF panel — stays in DOM, animates width */}
            {pdfUrl && (
              <div
                className="hidden lg:block shrink-0 overflow-hidden"
                style={{
                  width: pdfVisible ? "50%" : "0",
                  opacity: pdfVisible ? 1 : 0,
                  paddingLeft: pdfVisible ? "2rem" : "0",
                  transition:
                    "width 500ms ease-in-out, opacity 300ms ease-in-out, padding-left 500ms ease-in-out",
                }}
              >
                <div className="sticky top-8">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Regulation Source Document
                  </p>
                  <iframe
                    ref={iframeRef}
                    src={viewerSrc(pdfUrl)}
                    title="Regulation Source Document"
                    className="h-[calc(100vh-6rem)] w-full rounded-xl border border-gray-200 bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PdfPanelContext.Provider>
  );
}
