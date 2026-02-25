import type { RegulationContent } from "@/lib/types/regulation-content";

export const privacyActContent: RegulationContent = {
  introduction: null,
  processForms: {},
  manifest: {
    pdfUrl: null,
    mermaidDiagram: null,
    hasIntroductionForm: false,
    processList: [],
  },
};
