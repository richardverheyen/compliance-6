import type { RegulationContent } from "@/lib/types/regulation-content";
import { amlCTFContent, AML_PROCESS_TO_SECTION } from "./aml-ctf-rules";
import { privacyActContent } from "./privacy-act-1988";

const REGULATION_CONTENT: Record<string, RegulationContent> = {
  "aml-ctf-rules": amlCTFContent,
  "privacy-act-1988": privacyActContent,
};

export function getRegulationContent(id: string): RegulationContent | null {
  return REGULATION_CONTENT[id] ?? null;
}

/** Returns a slug → sectionId map for a regulation (used for inline form links). */
export function getProcessToSection(regulationId: string): Record<string, string> {
  if (regulationId === "aml-ctf-rules") return AML_PROCESS_TO_SECTION;
  return {};
}
