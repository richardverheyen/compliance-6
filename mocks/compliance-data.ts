import type {
  Legislation,
  BusinessProcess,
  ComplianceRating,
  TeamMember,
  ComplianceEvent,
  LegislationSection,
} from "@/lib/types/compliance";
import type { SectionData, FormField, FormGroup, FormRule } from "@/lib/compliance-forms";
import { getFieldStatus, mergeRecords } from "@/lib/compliance-forms";

import data_4_1 from "@/data/aml-ctf/data_4_1.json";
import data_4_2 from "@/data/aml-ctf/data_4_2.json";
import data_4_3 from "@/data/aml-ctf/data_4_3.json";
import data_4_4 from "@/data/aml-ctf/data_4_4.json";
import data_4_5 from "@/data/aml-ctf/data_4_5.json";
import data_4_6 from "@/data/aml-ctf/data_4_6.json";
import data_4_7 from "@/data/aml-ctf/data_4_7.json";
import data_4_8 from "@/data/aml-ctf/data_4_8.json";
import data_4_9 from "@/data/aml-ctf/data_4_9.json";
import data_4_10 from "@/data/aml-ctf/data_4_10.json";
import data_4_11 from "@/data/aml-ctf/data_4_11.json";
import data_4_12 from "@/data/aml-ctf/data_4_12.json";
import data_4_13 from "@/data/aml-ctf/data_4_13.json";
import data_4_14 from "@/data/aml-ctf/data_4_14.json";
import data_4_15 from "@/data/aml-ctf/data_4_15.json";

// Map section IDs to their raw data
const rawSectionData: Record<string, { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] }> = {
  "4_1": data_4_1 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_2": data_4_2 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_3": data_4_3 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_4": data_4_4 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_5": data_4_5 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_6": data_4_6 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_7": data_4_7 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_8": data_4_8 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_9": data_4_9 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_10": data_4_10 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_11": data_4_11 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_12": data_4_12 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_13": data_4_13 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_14": data_4_14 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
  "4_15": data_4_15 as { fields: FormField[]; groups: FormGroup[]; rules: FormRule[] },
};

// Get merged section data (some sections share data across JSON files)
export function getSectionData(sectionId: string): SectionData {
  const data = rawSectionData[sectionId];
  if (!data) {
    return { fields: [], groups: [], rules: [] };
  }
  return {
    fields: data.fields || [],
    groups: data.groups || [],
    rules: data.rules || [],
  };
}

// Get ALL section data merged (for cross-section rule evaluation)
export function getAllSectionData(): SectionData {
  let fields: FormField[] = [];
  let groups: FormGroup[] = [];
  let rules: FormRule[] = [];
  for (const data of Object.values(rawSectionData)) {
    fields = mergeRecords(fields, (data.fields || []) as FormField[]);
    groups = mergeRecords(groups, (data.groups || []) as FormGroup[]);
    rules = mergeRecords(rules, (data.rules || []) as FormRule[], "target" as keyof FormRule);
  }
  return { fields, groups, rules };
}

// Build sections catalog from root groups in each data file
function findRootTitle(data: { groups: FormGroup[] }, sectionId: string): { title: string; description?: string } {
  const rootGroup = data.groups.find((g) => g.id === sectionId);
  if (rootGroup) return { title: rootGroup.title, description: rootGroup.description };
  return { title: `Part ${sectionId.replace("_", ".")}` };
}

const sectionTitles: Record<string, { title: string; description?: string }> = {};
for (const [id, data] of Object.entries(rawSectionData)) {
  sectionTitles[id] = findRootTitle(data as { groups: FormGroup[] }, id);
}

export const amlCtfSections: LegislationSection[] = Object.entries(sectionTitles).map(
  ([id, info]) => ({
    id,
    partNumber: id.replace(/_/g, "."),
    title: info.title,
    description: info.description,
  }),
);

export const legislationsCatalog: Legislation[] = [
  {
    id: "aml-ctf-rules",
    name: "Anti-Money Laundering and Counter-Terrorism Financing Rules",
    shortName: "AML/CTF Rules",
    agency: "AUSTRAC",
    jurisdiction: "Australia",
    description:
      "Rules governing the obligations of reporting entities under the AML/CTF Act, including customer identification, ongoing due diligence, and suspicious matter reporting.",
    applicableServices: [
      "Banking",
      "Remittance",
      "Digital Currency Exchange",
      "Financial Planning",
      "Insurance",
      "Superannuation",
    ],
    sections: amlCtfSections,
  },
];

// Compute real processes from form answers
export function computeProcessesFromAnswers(
  sectionAnswers: Record<string, Record<string, string>>,
): BusinessProcess[] {
  return amlCtfSections.map((section) => {
    const data = getSectionData(section.id);
    const answers = sectionAnswers[section.id] || {};

    const steps = data.fields.map((field) => {
      const status = getFieldStatus(field, answers);
      let rating: ComplianceRating;
      if (status === "success") rating = "green";
      else if (status === "error") rating = "red";
      else if (status === "warning") rating = "yellow";
      else rating = "red"; // pending = red (not yet answered)

      return {
        id: field.id,
        title: field.label,
        rating,
      };
    });

    return {
      id: section.id,
      title: section.title,
      steps,
      lastUpdated: new Date().toISOString(),
    };
  });
}

export const mockTeamMembers: TeamMember[] = [
  { id: "tm-1", name: "Sarah Jenkins", email: "sarah.jenkins@company.com", role: "Compliance Officer", avatarColor: "bg-indigo-500" },
  { id: "tm-2", name: "Michael Chen", email: "michael.chen@company.com", role: "Risk Analyst", avatarColor: "bg-emerald-500" },
  { id: "tm-3", name: "Priya Sharma", email: "priya.sharma@company.com", role: "AML Specialist", avatarColor: "bg-amber-500" },
  { id: "tm-4", name: "James O'Brien", email: "james.obrien@company.com", role: "Operations Manager", avatarColor: "bg-rose-500" },
  { id: "tm-5", name: "Linda Nguyen", email: "linda.nguyen@company.com", role: "Legal Counsel", avatarColor: "bg-cyan-500" },
];

export const complianceCalendarEvents: ComplianceEvent[] = [
  { date: "MAR 31", title: "Annual AML Compliance Report", agency: "AUSTRAC", description: "Mandatory 2025/26 Review" },
  { date: "MAY 31", title: "Motor Finance Redress Deadline", agency: "FCA", description: "Final response period ends" },
  { date: "JUL 01", title: "Tranche 2 Obligations Start", agency: "AUSTRAC", description: "Real Estate/Legal sectors captured" },
  { date: "AUG 02", title: "EU AI Act Enforcement", agency: "GDPR/EC", description: "High-risk AI obligations apply" },
  { date: "SEP 15", title: "Annual Privacy Audit", agency: "GDPR", description: "DPO internal review due" },
];
