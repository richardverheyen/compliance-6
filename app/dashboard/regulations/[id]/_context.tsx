"use client";

import { createContext, useContext } from "react";

export type PdfPanelContextValue = {
  pdfVisible: boolean;
  togglePdf: () => void;
  pdfUrl: string | null;
  navigateToPdfDestination: (ruleCode: string) => void;
};

export const PdfPanelContext = createContext<PdfPanelContextValue>({
  pdfVisible: false,
  togglePdf: () => {},
  pdfUrl: null,
  navigateToPdfDestination: () => {},
});

export function usePdfPanel(): PdfPanelContextValue {
  return useContext(PdfPanelContext);
}
