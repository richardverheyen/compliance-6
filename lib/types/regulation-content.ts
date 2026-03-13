import type { ProcessForm } from "./process-form";

export interface IntroductionData {
  groups: Array<{ id: string; title: string; description?: string }>;
  buttonGroups: Record<string, {
    label: string;
    multi: boolean;
    persist?: boolean;
    options: Array<{ key: string; label: string; controlId: string }>;
  }>;
  scoping: Record<string, { sections: string[]; processes: string[] }>;
  alwaysActive: { sections: string[]; processes: string[] };
  derived?: Record<string, { from: string[] }>;
}

export interface ProcessListEntry {
  id: string;           // process slug (e.g. "risk-assessment")
  title: string;
  description?: string;
  gatedBy?: string | null; // controlId that gates visibility (null = always visible)
}

export interface PdfDocument {
  label: string;
  url: string;
}

export interface RegulationManifest {
  pdfUrl: string | null;
  documents?: PdfDocument[];   // primary is [0], secondaries follow
  mermaidDiagram: string | null;
  hasIntroductionForm: boolean;
  processList: ProcessListEntry[];   // ordered list of process forms
}

export interface RegulationContent {
  introduction: IntroductionData | null;
  processForms: Record<string, ProcessForm>;  // keyed by process slug
  manifest: RegulationManifest;
}
