import type {
  Regulation,
  RegulationProcess,
  BusinessProcess,
  ComplianceRating,
  TeamMember,
  ComplianceEvent,
  RegulationKeyDate,
} from "@/lib/types/compliance";
import type { SectionData, FormField } from "@/lib/compliance-forms";
import { getFieldStatus } from "@/lib/compliance-forms";
import { amlCTFContent } from "./regulation-content/aml-ctf-rules";

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

export function getRegulationProcessForSlug(slug: string, regulationId: string): RegulationProcess | undefined {
  const processId = FORM_TO_PROCESS_MAP[slug];
  if (!processId) return undefined;
  const regulation = regulationsCatalog.find((r) => r.id === regulationId);
  return regulation?.processes.find((p) => p.id === processId);
}

export function getProcessIdForSlug(slug: string): string | undefined {
  return FORM_TO_PROCESS_MAP[slug];
}

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

export function isProcessConfirmed(processId: string, confirmedSlugs: Set<string>): boolean {
  const mapped = PROCESS_FORM_MAP[processId];
  if (!mapped) return true; // no form mapping = always show
  const slugs = Array.isArray(mapped) ? mapped : [mapped];
  return slugs.some(s => confirmedSlugs.has(s));
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

export const privacyActProcesses: RegulationProcess[] = [
  {
    id: "PROC-PRIV-001",
    name: "Privacy Governance",
    description:
      "Establishing and maintaining the governance framework for privacy compliance, including designating a privacy officer, maintaining a privacy policy, conducting privacy impact assessments for new initiatives, and training staff on privacy obligations under the Privacy Act 1988.",
    businessObjective:
      "Embed privacy accountability across the organisation so that personal information handling obligations are understood, assigned, and systematically met",
    frequency: "ongoing",
    frequencyPer: "organisation",
    frequencyDetail:
      "Policy reviewed annually or upon material change to data handling practices or regulatory requirements",
    frequencyLabel: "Ongoing",
  },
  {
    id: "PROC-PRIV-001a",
    name: "Privacy Policy Management",
    parentId: "PROC-PRIV-001",
    description:
      "Maintaining a clearly expressed, up-to-date privacy policy that describes the kinds of personal information collected, how it is collected, held, used, and disclosed, how individuals may access and correct their information, and how to make a privacy complaint.",
    businessObjective:
      "Satisfy APP 1 transparency obligations and provide individuals with a clear and accessible account of how their personal information is managed",
    frequency: "ongoing",
    frequencyPer: "organisation",
    frequencyDetail:
      "Reviewed at least annually and updated whenever handling practices change materially",
    frequencyLabel: "Annual Review",
  },
  {
    id: "PROC-PRIV-001b",
    name: "Privacy Impact Assessments",
    parentId: "PROC-PRIV-001",
    description:
      "Conducting privacy impact assessments (PIAs) for new projects, systems, or data flows that involve the collection or handling of personal information, identifying privacy risks and implementing mitigations before the initiative is launched.",
    businessObjective:
      "Proactively identify and mitigate privacy risks in new initiatives before personal information is collected or systems are deployed",
    frequency: "once",
    frequencyPer: "project",
    frequencyDetail:
      "Performed prior to launch of any new product, service, or system that involves personal information handling",
    frequencyLabel: "Once per Project",
  },
  {
    id: "PROC-PRIV-002",
    name: "Collection and Notification",
    description:
      "Ensuring personal information is only collected where reasonably necessary for the entity's functions, that collection methods are lawful and fair, and that individuals are notified of key collection details at or before the time of collection in accordance with APPs 3–5.",
    businessObjective:
      "Limit collection to what is genuinely required and ensure individuals are fully informed about how their personal information will be used at the point of collection",
    frequency: "once",
    frequencyPer: "customer",
    frequencyDetail:
      "Performed at the point of initial collection; collection notices reviewed annually or when purposes change",
    frequencyLabel: "Once per Customer",
  },
  {
    id: "PROC-PRIV-003",
    name: "Use and Disclosure Controls",
    description:
      "Controls governing the use and disclosure of personal information, ensuring it is only used or disclosed for the primary purpose of collection or a permitted secondary purpose (APP 6), that direct marketing use meets opt-out and consent requirements (APP 7), and that overseas disclosures satisfy cross-border accountability obligations (APP 8).",
    businessObjective:
      "Prevent unauthorised use or disclosure of personal information and ensure all secondary uses are within the boundaries permitted by the APPs",
    frequency: "ongoing",
    frequencyPer: "transaction",
    frequencyDetail:
      "Applied at each point of use or disclosure; direct marketing lists reviewed quarterly; cross-border agreements reviewed annually",
    frequencyLabel: "Ongoing per Transaction",
  },
  {
    id: "PROC-PRIV-004",
    name: "Data Quality and Security",
    description:
      "Processes to maintain the accuracy, completeness, and currency of personal information before use or disclosure (APP 10), and to protect personal information from misuse, interference, loss, and unauthorised access through appropriate technical and organisational security measures (APP 11), including a data breach response procedure aligned with the Notifiable Data Breaches scheme.",
    businessObjective:
      "Ensure personal information remains accurate and is protected against unauthorised access or loss throughout its lifecycle, and that eligible data breaches are identified and notified promptly",
    frequency: "ongoing",
    frequencyPer: "organisation",
    frequencyDetail:
      "Security controls reviewed annually; data quality checks applied before material use or disclosure; breach response tested at least annually",
    frequencyLabel: "Ongoing",
  },
  {
    id: "PROC-PRIV-004a",
    name: "Notifiable Data Breaches",
    parentId: "PROC-PRIV-004",
    description:
      "Procedures for assessing and responding to suspected data breaches in accordance with the Notifiable Data Breaches (NDB) scheme under Part IIIC of the Privacy Act 1988. Includes triage and containment, assessment of whether a breach is 'eligible' (likely to result in serious harm), notification to the OAIC and affected individuals within 30 days of becoming aware, and post-incident review.",
    businessObjective:
      "Meet statutory notification obligations under the NDB scheme and minimise harm to individuals by responding promptly and transparently to eligible data breaches",
    frequency: "once",
    frequencyPer: "incident",
    frequencyDetail:
      "Triggered upon becoming aware of a suspected eligible data breach; OAIC notification required within 30 days of awareness",
    frequencyLabel: "Once per Incident",
  },
  {
    id: "PROC-PRIV-005",
    name: "Individual Rights Management",
    description:
      "Processes for handling individual requests to access (APP 12) and correct (APP 13) their personal information, including acknowledging requests within required timeframes, locating and providing access to held information, correcting inaccurate or misleading information, and managing privacy complaints in accordance with the OAIC's complaint handling requirements.",
    businessObjective:
      "Uphold individuals' rights over their personal information by providing timely access and correction, and resolving privacy complaints fairly and efficiently",
    frequency: "once",
    frequencyPer: "request",
    frequencyDetail:
      "Handled on receipt; access provided within 30 days (or extended with notice); complaints acknowledged within 30 days",
    frequencyLabel: "Once per Request",
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
      "Governs AML/CTF obligations for designated service providers in Australia, covering customer identification programs, ongoing due diligence, transaction monitoring, and suspicious matter reporting to AUSTRAC. Extended to Tranche 2 entities — including real estate agents, lawyers, and accountants — from 1 July 2026.",
    applicableServices: [
      "Banking",
      "Remittance",
      "Digital Currency Exchange",
      "Financial Planning",
      "Insurance",
      "Superannuation",
    ],
    processes: amlCtfProcesses,
  },
  {
    id: "privacy-act-1988",
    name: "Privacy Act 1988 — Australian Privacy Principles",
    shortName: "Privacy Act (APPs)",
    agency: "OAIC",
    jurisdiction: "Australia",
    description:
      "The Australian Privacy Principles (APPs) set out the obligations of Australian Government agencies and private sector organisations with an annual turnover above $3 million (and certain others) in relation to the collection, use, disclosure, quality, security, and individual access to personal information.",
    applicableServices: [
      "Banking",
      "Insurance",
      "Superannuation",
      "Healthcare",
      "Telecommunications",
      "Retail",
      "Technology",
      "Financial Planning",
    ],
    processes: privacyActProcesses,
  },
];

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

export const mockTeamMembers: TeamMember[] = [
  { id: "tm-1", name: "Sarah Jenkins", email: "sarah.jenkins@company.com", role: "Compliance Officer", avatarColor: "bg-indigo-500" },
];

export const regulationKeyDates: Record<string, RegulationKeyDate[]> = {
  "aml-ctf-rules": [
    {
      id: "aml-annual-report",
      title: "Annual Compliance Report",
      description:
        "Submit the Annual Compliance Report to AUSTRAC covering the preceding calendar year. All reporting entities must complete this via AUSTRAC Online by 31 March each year.",
      isoDate: "2026-03-31",
      recurrence: "annual",
      isCountdownPrimary: true,
    },
    {
      id: "aml-tranche2-start",
      title: "Tranche 2 Obligations Commence",
      description:
        "Extended AML/CTF obligations apply to real estate agents and developers, lawyers, conveyancers, accountants, and trust & company service providers from this date.",
      isoDate: "2026-07-01",
      recurrence: "once",
    },
    {
      id: "aml-program-review",
      title: "AML/CTF Program Annual Review",
      description:
        "Complete the mandatory annual review and update of the AML/CTF Program, including risk assessments, Part A and Part B controls, and board sign-off.",
      isoDate: "2026-12-31",
      recurrence: "annual",
    },
  ],
  "privacy-act-1988": [
    {
      id: "priv-compliance-review",
      title: "Annual Privacy Compliance Review",
      description:
        "Conduct the annual privacy compliance review: audit personal information holdings, update the privacy policy, verify staff training records, and review PIA outcomes.",
      isoDate: "2026-06-30",
      recurrence: "annual",
      isCountdownPrimary: true,
    },
    {
      id: "priv-pia-review",
      title: "Privacy Impact Assessment Review",
      description:
        "Review privacy impact assessments for all active projects and systems that handle personal information, and remediate any identified privacy risks.",
      isoDate: "2026-09-30",
      recurrence: "annual",
    },
    {
      id: "priv-staff-training",
      title: "Staff Privacy Training",
      description:
        "Complete annual privacy awareness training for all staff with access to personal information. Record completion for audit purposes.",
      isoDate: "2026-11-30",
      recurrence: "annual",
    },
  ],
};

export const complianceCalendarEvents: ComplianceEvent[] = [
  { date: "MAR 31", title: "Annual AML Compliance Report", agency: "AUSTRAC", description: "Mandatory 2025/26 Review" },
  { date: "MAY 31", title: "Motor Finance Redress Deadline", agency: "FCA", description: "Final response period ends" },
  { date: "JUL 01", title: "Tranche 2 Obligations Start", agency: "AUSTRAC", description: "Real Estate/Legal sectors captured" },
  { date: "AUG 02", title: "EU AI Act Enforcement", agency: "GDPR/EC", description: "High-risk AI obligations apply" },
  { date: "SEP 15", title: "Annual Privacy Audit", agency: "GDPR", description: "DPO internal review due" },
];
