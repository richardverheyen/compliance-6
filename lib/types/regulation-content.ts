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

export interface RegulationManifest {
  pdfUrl: string | null;
  mermaidDiagram: string | null;
  hasIntroductionForm: boolean;
  sectionGating: Record<string, string | null>; // sectionId → gating controlId (null = always visible)
}

export interface RegulationContent {
  introduction: IntroductionData | null;
  sectionForms: Record<string, ProcessForm>;
  manifest: RegulationManifest;
}
