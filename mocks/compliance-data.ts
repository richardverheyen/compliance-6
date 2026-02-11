import type {
  Legislation,
  LegislationProcess,
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

export const amlCtfProcesses: LegislationProcess[] = [
  {
    id: "PROC-AML-001",
    name: "Risk Assessment",
    description: "Process of identifying, assessing, and documenting money laundering and terrorism financing (ML/TF) risks associated with customers, products, services, delivery channels, and jurisdictions",
    businessObjective: "Identify, mitigate, and manage ML/TF risks to prevent the entity from being used for illicit activities",
    frequency: "ongoing",
    frequencyPer: "entity",
    frequencyDetail: "Conducted initially, then regularly reviewed (e.g., annually or upon material changes) and updated as part of the AML/CTF program",
    frequencyLabel: "Ongoing per Entity",
  },
  {
    id: "PROC-AML-002",
    name: "Beneficial Owner",
    description: "Process of identifying and verifying the ultimate beneficial owners (individuals who ultimately own or control the customer) for legal entities or arrangements",
    businessObjective: "Ensure transparency in ownership structures to detect and prevent misuse for ML/TF purposes",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail: "Performed during customer onboarding, with updates triggered by material changes or as part of ongoing due diligence",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-003",
    name: "Politically Exposed Persons",
    description: "Process of screening customers and beneficial owners to determine if they are politically exposed persons (PEPs), their family members, or close associates, and applying appropriate due diligence",
    businessObjective: "Mitigate heightened corruption and ML/TF risks associated with PEPs through enhanced scrutiny",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail: "Conducted during onboarding and as part of ongoing due diligence (e.g., when new information arises or periodically reviewed)",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-004",
    name: "OCDD",
    description: "Ongoing Customer Due Diligence process to monitor customer relationships, review and update information, and detect changes in risk profile or suspicious activity",
    businessObjective: "Maintain up-to-date customer information and identify emerging ML/TF risks throughout the business relationship",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail: "Continuous monitoring, with periodic reviews, transaction analysis, and updates triggered by events or risk indicators",
    frequencyLabel: "Ongoing per Customer",
  },
  {
    id: "PROC-AML-005",
    name: "ECDD",
    description: "Enhanced Customer Due Diligence process applied to high-risk customers (e.g., PEPs, high-risk jurisdictions, or elevated ML/TF risk), involving additional verification, source of funds/wealth checks, and senior approval",
    businessObjective: "Apply proportionate additional controls to manage elevated ML/TF risks and prevent abuse",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail: "Triggered when a high-risk scenario is identified (e.g., during onboarding, OCDD, or risk reassessment)",
    frequencyLabel: "Once per Customer",
  },
];

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
    processes: amlCtfProcesses,
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
];

export const complianceCalendarEvents: ComplianceEvent[] = [
  { date: "MAR 31", title: "Annual AML Compliance Report", agency: "AUSTRAC", description: "Mandatory 2025/26 Review" },
  { date: "MAY 31", title: "Motor Finance Redress Deadline", agency: "FCA", description: "Final response period ends" },
  { date: "JUL 01", title: "Tranche 2 Obligations Start", agency: "AUSTRAC", description: "Real Estate/Legal sectors captured" },
  { date: "AUG 02", title: "EU AI Act Enforcement", agency: "GDPR/EC", description: "High-risk AI obligations apply" },
  { date: "SEP 15", title: "Annual Privacy Audit", agency: "GDPR", description: "DPO internal review due" },
];
