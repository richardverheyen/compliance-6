import type {
  Regulation,
  RegulationProcess,
  BusinessProcess,
  ComplianceRating,
  TeamMember,
  ComplianceEvent,
  RegulationSection,
} from "@/lib/types/compliance";
import type { SectionData, FormField } from "@/lib/compliance-forms";
import { getFieldStatus } from "@/lib/compliance-forms";
import { getProcessFormForSection, SECTION_TO_PROCESS, getProcessTitle } from "@/lib/process-forms";

// Get section data from process form
export function getSectionData(sectionId: string): SectionData {
  try {
    const form = getProcessFormForSection(sectionId);
    return {
      fields: form.controls as unknown as FormField[],
      groups: form.groups,
      rules: form.rules,
    };
  } catch {
    return { fields: [], groups: [], rules: [] };
  }
}

// Build sections catalog from process forms
export const amlCtfSections: RegulationSection[] = Object.entries(SECTION_TO_PROCESS).map(
  ([sectionId, slug]) => {
    const { title, description } = getProcessTitle(slug);
    return {
      id: sectionId,
      partNumber: sectionId.replace(/_/g, "."),
      title,
      description,
    };
  },
);

export const amlCtfProcesses: RegulationProcess[] = [
  // ── Customer Agents (Part 4.11) ──
  {
    id: "PROC-AML-001",
    name: "Customer Agents",
    description:
      "Procedures for collecting information about individuals authorised to act for customers — both individual and non-natural (corporate) — in relation to designated services. Covers collection of agent information and authorisation evidence, risk-based verification of agent identity for both individual and non-natural customer agents, and an optional verifying officer pathway where a nominated officer collects and validates agent details on the reporting entity's behalf.",
    businessObjective:
      "Ensure agents acting on behalf of customers are properly identified, authorised, and assessed for ML/TF risk before transacting, preventing unauthorised access and reducing exposure from agent relationships",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed when an agent is first presented; repeated if the agent or authorisation changes",
    frequencyLabel: "Once per Customer Agent",
  },

  // ── Customer Due Diligence (Parts 4.2–4.10) ──
  {
    id: "PROC-AML-002",
    name: "Customer Due Diligence",
    description:
      "The overarching program of risk-based systems and controls for verifying customer identity across all customer types — individuals, sole traders, companies, trusts, partnerships, associations, co-operatives, and government bodies. Encompasses collection of minimum KYC information for each customer type, verification of that information using reliable and independent sources, risk-based assessment of whether additional KYC should be collected and verified, and discrepancy-handling procedures where verification reveals inconsistencies.",
    businessObjective:
      "Establish a reliable, independently verified understanding of each customer's identity before or as soon as practicable after providing a designated service, proportionate to the ML/TF risk presented by the customer relationship",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Conducted at the commencement of the customer relationship; components are repeated or updated when risk indicators or regulatory triggers arise",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002a",
    name: "Onboarding — KYC Collection",
    parentId: "PROC-AML-002",
    description:
      "Collection of minimum KYC information at the point of customer onboarding, tailored to customer type. Individuals and sole traders: full name, date of birth, and residential address. Companies: full registered name, registered office address, ACN/ARBN, and company type. Trusts: trust name, trustee details, trust type, country of establishment, and settlor information. Partnerships: partnership name, business name, and individual partner details. Associations (incorporated and unincorporated): entity name, governing committee members, and principal place of administration. Co-operatives: registered name and key officer details. Government bodies: entity name, principal place of operations, and beneficial ownership where applicable.",
    businessObjective:
      "Collect the minimum information required to establish a customer's identity at the start of the relationship and support subsequent verification and risk-assessment steps",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed once during initial customer onboarding, before or as soon as practicable after the provision of a designated service",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002b",
    name: "Onboarding — Verification",
    parentId: "PROC-AML-002",
    description:
      "Verification of collected KYC information from reliable and independent sources, using documentation (Part 4.9) or electronic data (Part 4.10), or a combination. For individuals, verification confirms full name and either date of birth or residential address; for non-individual customers it confirms entity existence and registration details. Includes risk-based assessment of additional verification, safe harbour procedures for medium-or-lower risk customers, and systems to respond to discrepancies arising during verification. Document verification covers expiry checks, document standards and authentication controls for both individuals and non-individuals. Electronic verification covers reliability assessment, pre-selection of electronic data sources, and pre-defined match and error tolerance levels.",
    businessObjective:
      "Confirm the accuracy and authenticity of customer identity information through independent sources so the reporting entity is reasonably satisfied the customer is who they claim to be",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed during onboarding; re-verification is triggered by material changes, discrepancies, or ongoing due diligence requirements",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-002c",
    name: "ML/TF Risk Assessment",
    parentId: "PROC-AML-002",
    description:
      "Assessment of the key ML/TF risk factors a reporting entity must consider when identifying, managing, and mitigating money laundering or terrorism financing risk. Factors include customer types (including beneficial owners and PEPs), sources of funds and wealth, the nature and purpose of the business relationship, control structures of non-individual customers, types of designated services provided, delivery channels, and foreign jurisdictions involved. Also covers special application rules for customers acquired after regulatory transition dates and the applicability of enhanced due diligence requirements.",
    businessObjective:
      "Identify, document, and manage the ML/TF risk factors inherent in the entity's customer base and service delivery so that proportionate due diligence and program controls are applied",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Conducted initially at onboarding; reviewed and updated regularly (at least annually or upon material change) as part of the AML/CTF program",
    frequencyLabel: "Ongoing per Customer",
  },

  // ── Enhanced CDD (Parts 4.12–4.13) ──
  {
    id: "PROC-AML-003",
    name: "Enhanced CDD",
    description:
      "Enhanced Customer Due Diligence applied where a customer, beneficial owner, or associated person presents elevated ML/TF risk. Encompasses the beneficial ownership process (Part 4.12) — determining, collecting, and verifying ownership and control information for non-individual customers — and the PEP screening process (Part 4.13) — determining whether a customer or beneficial owner is a politically exposed person and applying enhanced procedures including senior management approval, source of wealth and funds checks, and ongoing monitoring.",
    businessObjective:
      "Apply proportionate additional controls to manage elevated ML/TF risks, ensure transparency of ownership and control structures, and prevent abuse of the financial system by high-risk individuals or entities",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Triggered when a higher-risk indicator is identified at onboarding, during ongoing CDD, or upon risk reassessment",
    frequencyLabel: "Once per High-Risk Customer",
  },
  {
    id: "PROC-AML-003a",
    name: "Beneficial Ownership",
    parentId: "PROC-AML-003",
    description:
      "The obligation to determine the beneficial owner of each customer and collect and verify each beneficial owner's full name and either date of birth or residential address. Includes the general obligation, exemptions and simplifications (for listed companies, regulated trusts, Australian Government entities, and transparent foreign listed companies), collection of minimum and additional beneficial owner information, verification using reliable and independent sources, optional safe harbour procedures for medium-or-lower risk beneficial owners, risk-based systems to respond to discrepancies, and fallback procedures where a beneficial owner cannot be ascertained — identifying and verifying persons with 25% or more voting rights or senior managing officials.",
    businessObjective:
      "Ensure transparency in ownership and control structures to detect and prevent misuse of entities for money laundering or terrorism financing purposes",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed during customer onboarding; updated when ownership or control structures change or as part of ongoing due diligence",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-003b",
    name: "PEP Screening",
    parentId: "PROC-AML-003",
    description:
      "Risk-management systems to determine whether a customer or beneficial owner is a politically exposed person (PEP), covering the timing of determination and different procedural tracks. Domestic PEPs and international organisation PEPs: identification, beneficial ownership compliance, and ML/TF risk assessment. High-ML/TF-risk domestic PEPs: enhanced due diligence actions. Foreign PEPs and high-risk organisation PEPs: enhanced identification, senior management approval before establishing or continuing the relationship, reasonable measures to establish source of wealth and source of funds, and compliance with ongoing CDD obligations. Includes discrepancy-response controls for PEP verification.",
    businessObjective:
      "Mitigate heightened corruption and ML/TF risks associated with politically exposed persons through enhanced scrutiny, senior management oversight, and source of wealth and funds checks",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Determined before the provision of a designated service, or as soon as practicable after; ongoing monitoring continues throughout the relationship",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-AML-003c",
    name: "Identity Verification Standards",
    parentId: "PROC-AML-003",
    description:
      "Verification standards applicable across CDD and ECDD. Documentary verification (Part 4.9): establishing whether the AML/CTF program uses reliable and independent documentation, document expiry and validity checks, document standards and authentication controls for individuals and non-individuals, and independent confirmation procedures. Electronic verification (Part 4.10): scope and applicability, reliability assessment of electronic data sources (accuracy, security, currency, comprehensiveness, authentication capability), pre-selection of data sources, pre-defined match and error tolerance levels, and independent contact verification. Alternative identity proofing (Part 4.15): gatekeeping conditions, alternative verification processes, self-attestation documentation and risk management, validation controls, and COVID-19 document flexibility provisions.",
    businessObjective:
      "Define the standards, methods, and controls by which the reporting entity verifies KYC information about customers and beneficial owners through reliable and independent documentation and electronic data sources",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Applied during CDD and ECDD verification; standards are reviewed as part of the AML/CTF program and updated when regulatory requirements change",
    frequencyLabel: "Once per Customer",
  },

  // ── Ongoing CDD / Record Keeping ──
  {
    id: "PROC-AML-004",
    name: "Ongoing CDD",
    description:
      "Ongoing Customer Due Diligence process to continuously monitor customer relationships, review and update KYC information, and detect changes in risk profile or suspicious activity. Applies to all customer types and covers re-verification, clarification, and detailed analysis of KYC and beneficial owner information throughout the business relationship. Includes record-keeping obligations to support the currency and accuracy of customer information and to meet regulatory audit requirements.",
    businessObjective:
      "Maintain an up-to-date and accurate understanding of each customer throughout the relationship so that emerging ML/TF risks are identified and managed promptly",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Continuous monitoring with periodic reviews and updates triggered by events, risk indicators, or changes in the customer's circumstances",
    frequencyLabel: "Ongoing per Customer",
  },
  {
    id: "PROC-AML-004a",
    name: "High Value Transactions",
    parentId: "PROC-AML-004",
    description:
      "Monitoring and reporting of transactions at or above prescribed thresholds, including threshold transaction reports (TTRs) for cash transactions of AUD 10,000 or more. Requires risk-based systems to identify transactions that are large, unusual, or inconsistent with the customer's known profile, and to collect additional information about source of funds and transaction purpose where the ML/TF risk assessment warrants it.",
    businessObjective:
      "Detect and report high-value transactions that may indicate money laundering or terrorism financing, ensuring threshold reporting obligations to AUSTRAC are met within prescribed timeframes",
    frequency: "ongoing",
    frequencyPer: "transaction",
    frequencyDetail:
      "Monitored in real-time or near real-time for each transaction; TTRs submitted within prescribed timeframes",
    frequencyLabel: "Ongoing per Transaction",
  },
  {
    id: "PROC-AML-004b",
    name: "Suspicious Matter Reporting",
    parentId: "PROC-AML-004",
    description:
      "Process of identifying and reporting suspicious matters to AUSTRAC in accordance with the AML/CTF Act. A reporting entity must submit a suspicious matter report (SMR) where it suspects on reasonable grounds that a customer's conduct or a transaction may be relevant to the investigation or prosecution of an offence, evasion of a taxation law, or proceeds of crime. Includes risk-based systems and controls to detect unusual patterns, anomalous activity, and ML/TF indicators identified during ongoing customer monitoring.",
    businessObjective:
      "Identify and escalate potentially illicit activity to AUSTRAC through timely suspicious matter reports, contributing to the detection and disruption of money laundering and terrorism financing",
    frequency: "ongoing",
    frequencyPer: "customer",
    frequencyDetail:
      "Triggered by suspicious activity identified during transaction monitoring, ongoing CDD, or risk reassessment; SMRs submitted within prescribed timeframes",
    frequencyLabel: "Ongoing per Customer",
  },
];

export const regulationsCatalog: Regulation[] = [
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
