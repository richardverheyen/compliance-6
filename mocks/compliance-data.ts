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
  // ── Customer Agents (Part 4.11) ──
  {
    id: "PROC-AML-001",
    name: "Customer Agents",
    description:
      "Process for identifying and verifying agents authorised to act for or on behalf of a customer in relation to a designated service. Includes collecting the full name of each individual who purports to act on behalf of the customer, obtaining evidence of the customer's authorisation, and applying risk-based systems to determine whether and to what extent the agent's identity should be verified, having regard to ML/TF risk (Parts 4.11.1–4.11.13).",
    businessObjective:
      "Ensure that individuals transacting on behalf of customers are properly identified and authorised, preventing unauthorised access and reducing ML/TF risk from agent relationships",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed when an agent is first presented, with updates if the agent or authorisation changes",
    frequencyLabel: "Once per Customer Agent",
  },

  // ── Customer Due Diligence (Parts 4.1–4.10) ──
  {
    id: "PROC-AML-002",
    name: "Customer Due Diligence",
    description:
      "The overarching process for identifying, verifying, and assessing customers under the AML/CTF Rules Chapter 4. Encompasses initial risk assessment of ML/TF factors, collection and verification of Know Your Customer (KYC) information for all customer types (individuals, companies, trusts, partnerships, associations, co-operatives, and government bodies), and application of risk-based systems and controls proportionate to the ML/TF risk posed by the customer relationship.",
    businessObjective:
      "Establish and maintain a reliable understanding of each customer's identity and risk profile to prevent the reporting entity from being used for money laundering or terrorism financing",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Conducted at the commencement of the customer relationship, with components repeated or updated as required by risk indicators or regulatory triggers",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002a",
    name: "Onboarding",
    parentId: "PROC-AML-002",
    description:
      "Collection of minimum KYC information at the point of customer onboarding, tailored to the customer type. For individuals (Part 4.2): full name, date of birth, and residential address. For companies (Part 4.3): full registered name, registered office address, ACN/ARBN, and company type. For trusts (Part 4.4): trust name, trustee details, trust type, and country of establishment. For partnerships (Part 4.5): partnership name, business name, and partner details. For associations (Part 4.6), co-operatives (Part 4.7), and government bodies (Part 4.8): entity name, principal place of operations, and key officer details.",
    businessObjective:
      "Collect sufficient KYC information at the start of the relationship to establish the customer's identity and enable subsequent verification and risk assessment",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed once during the initial customer onboarding before or as soon as practicable after the provision of a designated service",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002b",
    name: "Verification",
    parentId: "PROC-AML-002",
    description:
      "Verification of collected KYC information using reliable and independent documentation (Part 4.9) or electronic data (Part 4.10), or a combination of both. For individuals, this includes verifying full name and either date of birth or residential address from primary photographic or non-photographic identification documents, or from at least two separate electronic data sources. For non-individual customers, verification must confirm the entity's existence and registration details. Safe harbour procedures are available for medium or lower ML/TF risk relationships. Includes systems and controls to respond to discrepancies arising during verification.",
    businessObjective:
      "Confirm the accuracy and authenticity of customer identity information through independent sources, ensuring the reporting entity is reasonably satisfied the customer is who they claim to be",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed during onboarding, with re-verification triggered by material changes, discrepancies, or as part of ongoing due diligence",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002c",
    name: "Risk Assessment",
    parentId: "PROC-AML-002",
    description:
      "Identification and assessment of ML/TF risk associated with the customer relationship, considering the factors specified in Part 4.1.3: customer types (including beneficial owners and PEPs), sources of funds and wealth, nature and purpose of the business relationship, control structures of non-individual customers, types of designated services provided, delivery methods, and foreign jurisdictions involved. The assessment determines the level of due diligence required and informs the application of simplified, standard, or enhanced procedures.",
    businessObjective:
      "Identify, mitigate, and manage ML/TF risks to ensure the reporting entity applies proportionate due diligence and is not used for illicit activities",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Conducted initially during onboarding, then regularly reviewed (e.g., annually or upon material changes) and updated as part of the AML/CTF program",
    frequencyLabel: "Ongoing per Customer",
  },

  // ── Enhanced CDD (Parts 4.12–4.14) ──
  {
    id: "PROC-AML-003",
    name: "Enhanced CDD",
    description:
      "Enhanced Customer Due Diligence applied to higher-risk customer relationships, including the identification and verification of beneficial owners (Part 4.12) and politically exposed persons (Part 4.13). Involves additional collection and verification steps beyond standard CDD, source of funds/wealth checks, senior management approval, and consideration of exemptions (Part 4.14). Triggered when a customer or beneficial owner presents elevated ML/TF risk factors.",
    businessObjective:
      "Apply proportionate additional controls to manage elevated ML/TF risks, ensure transparency of ownership and control structures, and prevent abuse of the financial system by high-risk individuals or entities",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Triggered when a high-risk scenario is identified (e.g., during onboarding, ongoing CDD, or risk reassessment)",
    frequencyLabel: "Once per High Risk Customer",
  },
  {
    id: "PROC-AML-003a",
    name: "Beneficial Ownership",
    parentId: "PROC-AML-003",
    description:
      "Process of determining the beneficial owner of each customer and collecting and verifying each beneficial owner's full name and either date of birth or residential address (Part 4.12.1). For individual customers, the reporting entity may assume the customer and beneficial owner are the same unless there are reasonable grounds to consider otherwise. For companies verified under simplified procedures, regulated trusts, Australian Government entities, and transparent foreign listed companies, modified requirements apply (Part 4.12.2). Where a beneficial owner cannot be ascertained, the entity must identify persons with 25% or more voting rights or senior managing officials (Part 4.12.9).",
    businessObjective:
      "Ensure transparency in ownership and control structures to detect and prevent misuse of entities for ML/TF purposes",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed during customer onboarding, with updates triggered by material changes or as part of ongoing due diligence",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-003b",
    name: "Politically Exposed Persons",
    parentId: "PROC-AML-003",
    description:
      "Process of determining whether a customer or beneficial owner is a politically exposed person (PEP) and applying appropriate risk-management steps (Part 4.13). For domestic and international organisation PEPs: identify the person, determine if they are of high ML/TF risk, and if so apply enhanced measures. For foreign PEPs and high-risk domestic PEPs (Part 4.13.3): comply with individual identification requirements, obtain senior management approval before establishing or continuing the relationship, take reasonable measures to establish source of wealth and source of funds, and comply with ongoing CDD obligations under Chapter 15.",
    businessObjective:
      "Mitigate heightened corruption and ML/TF risks associated with politically exposed persons through enhanced scrutiny, senior oversight, and source of wealth/funds checks",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Determined before the provision of a designated service or as soon as practicable after, with ongoing monitoring as part of CDD",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-003c",
    name: "Verification",
    parentId: "PROC-AML-003",
    description:
      "Enhanced verification procedures applied to beneficial owners and politically exposed persons. For beneficial owners (Part 4.12.4): verification must be based on reliable and independent documentation, electronic data, or a combination of both. Safe harbour procedures are available for medium or lower risk beneficial owners using primary photographic ID, or two separate electronic data sources (Part 4.12.7), but are not applicable to foreign PEPs (Part 4.12.6). Includes risk-based systems to respond to discrepancies (Part 4.12.8) and alternative identity proofing processes for customers who cannot provide standard evidence of identity (Part 4.15).",
    businessObjective:
      "Confirm the identity of beneficial owners and PEPs through reliable independent sources, applying enhanced verification proportionate to the elevated risk profile",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed during ECDD, with re-verification triggered by discrepancies, material changes, or risk reassessment",
    frequencyLabel: "Once per Customer",
  },

  // ── Ongoing CDD (Chapter 15, referenced throughout Chapter 4) ──
  {
    id: "PROC-AML-004",
    name: "Ongoing CDD",
    description:
      "Ongoing Customer Due Diligence process to continuously monitor customer relationships, review and update KYC information, and detect changes in risk profile or suspicious activity. Includes re-verification, clarification, and detailed analysis of KYC and beneficial owner information as required by Chapter 15 of the AML/CTF Rules. Applies to all customer types and is referenced throughout Chapter 4 as the mechanism for maintaining the currency and accuracy of customer information after onboarding.",
    businessObjective:
      "Maintain up-to-date customer information and identify emerging ML/TF risks throughout the business relationship, ensuring the entity's understanding of the customer remains current and accurate",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Continuous monitoring with periodic reviews, transaction analysis, and updates triggered by events or risk indicators",
    frequencyLabel: "Ongoing per Customer",
  },
  {
    id: "PROC-AML-004a",
    name: "High Value Transactions",
    parentId: "PROC-AML-004",
    description:
      "Monitoring and reporting of transactions that meet or exceed prescribed thresholds, including threshold transaction reports (TTRs) for cash transactions of AUD 10,000 or more. Requires the reporting entity to apply risk-based systems and controls to identify transactions that are large, unusual, or inconsistent with the customer's known profile, and to collect additional information about the source of funds and purpose of the transaction where warranted by the ML/TF risk assessment.",
    businessObjective:
      "Detect and report high-value transactions that may indicate money laundering or terrorism financing, ensuring regulatory threshold reporting obligations are met",
    frequency: "ongoing",
    frequencyPer: "transaction",
    frequencyDetail:
      "Monitored in real-time or near real-time for each transaction, with reporting within prescribed timeframes",
    frequencyLabel: "Ongoing per Transaction",
  },
  {
    id: "PROC-AML-004b",
    name: "Suspicious Matter Reporting",
    parentId: "PROC-AML-004",
    description:
      "Process of identifying and reporting suspicious matters to AUSTRAC in accordance with the AML/CTF Act. A reporting entity must submit a suspicious matter report (SMR) where it suspects on reasonable grounds that a customer's conduct or a transaction may be relevant to the investigation or prosecution of a person for an offence against a Commonwealth, State, or Territory law, evasion of a taxation law, or proceeds of crime. Includes risk-based systems and controls to detect unusual patterns, anomalous activity, and indicators of ML/TF derived from the ongoing CDD process.",
    businessObjective:
      "Identify and escalate potentially illicit activity to AUSTRAC through timely suspicious matter reports, contributing to the detection and disruption of money laundering and terrorism financing",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Triggered by suspicious activity identified during ongoing monitoring, transaction analysis, or risk reassessment; SMRs must be submitted within prescribed timeframes",
    frequencyLabel: "Ongoing per Customer",
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
