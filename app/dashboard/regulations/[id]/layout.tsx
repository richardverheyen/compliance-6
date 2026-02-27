"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import { PdfPanelContext } from "./_context";

export default function RegulationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();

  const isProcessView = pathname.includes("/processes/");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfVisible, setPdfVisible] = useState(true);
  const [pdfDestination, setPdfDestination] = useState<string | null>(null);

  // Fetch manifest once to get pdfUrl
  useEffect(() => {
    fetch(`/api/compliance/regulations/${id}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((mf) => {
        if (mf?.pdfUrl) setPdfUrl(mf.pdfUrl);
      });
  }, [id]);

  // Auto-collapse PDF when entering a process view; auto-expand on overview.
  // Reset destination when leaving process view so overview gets clean PDF.
  useEffect(() => {
    if (isProcessView) {
      setPdfVisible(false);
    } else {
      setPdfVisible(true);
      setPdfDestination(null);
    }
  }, [isProcessView]);

  const togglePdf = useCallback(() => setPdfVisible((v) => !v), []);

  const navigateToPdfDestination = useCallback((ruleCode: string) => {
    setPdfDestination(ruleCode);
    setPdfVisible(true);
  }, []);

  // Append named destination fragment when navigating to a specific rule
  const effectivePdfSrc = pdfDestination
    ? `${pdfUrl}#nameddest=${encodeURIComponent(pdfDestination)}`
    : pdfUrl;

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
                    key={effectivePdfSrc ?? ""}
                    src={effectivePdfSrc ?? undefined}
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
