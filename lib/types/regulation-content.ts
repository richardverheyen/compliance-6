import type { ProcessForm } from "./process-form";

export interface IntroductionData {
  groups: Array<{ id: string; title: string; description?: string }>;
  buttonGroups: Record<string, {
    label: string;
    multi: boolean;
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

export interface RegulationManifest {
  pdfUrl: string | null;
  mermaidDiagram: string | null;
  hasIntroductionForm: boolean;
  processList: ProcessListEntry[];   // ordered list of process forms
}

export interface RegulationContent {
  introduction: IntroductionData | null;
  processForms: Record<string, ProcessForm>;  // keyed by process slug
  manifest: RegulationManifest;
}
