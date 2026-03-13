"use client";

import { createContext, useContext } from "react";

export type PdfDocument = { label: string; url: string };

export type PdfPanelContextValue = {
  pdfVisible: boolean;
  togglePdf: () => void;
  pdfUrl: string | null;
  documents: PdfDocument[];
  activeDocument: PdfDocument | null;
  setActiveDocument: (doc: PdfDocument) => void;
  navigateToPdfDestination: (ruleCode: string) => void;
};

export const PdfPanelContext = createContext<PdfPanelContextValue>({
  pdfVisible: false,
  togglePdf: () => {},
  pdfUrl: null,
  documents: [],
  activeDocument: null,
  setActiveDocument: () => {},
  navigateToPdfDestination: () => {},
});

export function usePdfPanel(): PdfPanelContextValue {
  return useContext(PdfPanelContext);
}
