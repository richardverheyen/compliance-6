import type { RegulationContent } from "@/lib/types/regulation-content";
import { amlCTFContent } from "./aml-ctf-rules";
import { privacyActContent } from "./privacy-act-1988";

const REGULATION_CONTENT: Record<string, RegulationContent> = {
  "aml-ctf-rules": amlCTFContent,
  "privacy-act-1988": privacyActContent,
};

export function getRegulationContent(id: string): RegulationContent | null {
  return REGULATION_CONTENT[id] ?? null;
}
