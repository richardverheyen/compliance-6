import type { RegulationProcess, BusinessProcess, ComplianceRating } from "@/lib/types/compliance";
import type { SectionData, FormField } from "@/lib/compliance-forms";
import { getFieldStatus } from "@/lib/compliance-forms";
import { amlCTFContent } from "@/mocks/regulation-content/aml-ctf-rules";

// Maps form slug → primary RegulationProcess ID
const FORM_TO_PROCESS_MAP: Record<string, string> = {
  "agent-management":        "PROC-AML-001",
  "cdd-individuals":         "PROC-AML-002a",
  "cdd-companies":           "PROC-AML-002a",
  "cdd-trusts":              "PROC-AML-002a",
  "cdd-partnerships":        "PROC-AML-002a",
  "cdd-associations":        "PROC-AML-002a",
  "cdd-cooperatives":        "PROC-AML-002a",
  "cdd-government":          "PROC-AML-002a",
  "verification-documents":  "PROC-AML-002b",
  "verification-electronic": "PROC-AML-002b",
  "risk-assessment":         "PROC-AML-002c",
  "beneficial-ownership":    "PROC-AML-003a",
  "pep-screening":           "PROC-AML-003b",
  "alternative-id":          "PROC-AML-003c",
};

// Maps RegulationProcess ID → form slug(s) that confirm it
const PROCESS_FORM_MAP: Record<string, string | string[]> = {
  "PROC-AML-001": "agent-management",
  "PROC-AML-002": ["cdd-individuals","cdd-companies","cdd-trusts","cdd-partnerships","cdd-associations","cdd-cooperatives","cdd-government"],
  "PROC-AML-002a": ["cdd-individuals","cdd-companies","cdd-trusts","cdd-partnerships","cdd-associations","cdd-cooperatives","cdd-government"],
  "PROC-AML-002b": ["verification-documents","verification-electronic"],
  "PROC-AML-002c": "risk-assessment",
  "PROC-AML-003": ["beneficial-ownership","pep-screening"],
  "PROC-AML-003a": "beneficial-ownership",
  "PROC-AML-003b": "pep-screening",
  "PROC-AML-003c": ["verification-documents","verification-electronic","alternative-id"],
  "PROC-AML-004": "record-keeping",
  "PROC-AML-004a": "record-keeping",
  "PROC-AML-004b": "record-keeping",
};

export function getRegulationProcessForSlug(
  slug: string,
  regulationProcesses: RegulationProcess[],
): RegulationProcess | undefined {
  const processId = FORM_TO_PROCESS_MAP[slug];
  if (!processId) return undefined;
  return regulationProcesses.find((p) => p.id === processId);
}

export function getProcessIdForSlug(slug: string): string | undefined {
  return FORM_TO_PROCESS_MAP[slug];
}

export function isProcessConfirmed(processId: string, confirmedSlugs: Set<string>): boolean {
  const mapped = PROCESS_FORM_MAP[processId];
  if (!mapped) return true; // no form mapping = always show
  const slugs = Array.isArray(mapped) ? mapped : [mapped];
  return slugs.some((s) => confirmedSlugs.has(s));
}

// Get form field data for a process slug (AML/CTF only — other regulations have no forms yet)
export function getSectionData(processSlug: string): SectionData {
  const form = amlCTFContent.processForms[processSlug];
  if (!form) return { fields: [], groups: [], rules: [] };
  return {
    fields: form.controls as unknown as FormField[],
    groups: form.groups,
    rules: form.rules,
  };
}

// Compute compliance statuses from saved form answers (keyed by process slug)
export function computeProcessesFromAnswers(
  sectionAnswers: Record<string, Record<string, string>>,
): BusinessProcess[] {
  return Object.keys(amlCTFContent.processForms).map((slug) => {
    const data = getSectionData(slug);
    const answers = sectionAnswers[slug] || {};

    const steps = data.fields.map((field) => {
      const rating: ComplianceRating =
        getFieldStatus(field, answers) === "success" ? "green" : "red";
      return {
        id: field.id,
        title: field.label,
        rating,
      };
    });

    const entry = amlCTFContent.manifest.processList.find((p) => p.id === slug);

    return {
      id: slug,
      title: entry?.title ?? slug,
      steps,
      confirmed: sectionAnswers[slug]?.["process-exists"] === "Yes",
      lastUpdated: new Date().toISOString(),
    };
  });
}
