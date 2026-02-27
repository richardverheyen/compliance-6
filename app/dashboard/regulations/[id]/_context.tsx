"use client";

import { createContext, useContext } from "react";

export type PdfPanelContextValue = {
  pdfVisible: boolean;
  togglePdf: () => void;
  pdfUrl: string | null;
};

export const PdfPanelContext = createContext<PdfPanelContextValue>({
  pdfVisible: false,
  togglePdf: () => {},
  pdfUrl: null,
});

export function usePdfPanel(): PdfPanelContextValue {
  return useContext(PdfPanelContext);
}
