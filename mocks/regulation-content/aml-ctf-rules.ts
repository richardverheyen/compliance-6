import type { RegulationContent } from "@/lib/types/regulation-content";
import type { ProcessForm } from "@/lib/types/process-form";

import introductionJson from "@/data/regulations/aml-ctf-rules/introduction.json";
import riskAssessment from "@/data/regulations/aml-ctf-rules/processes/risk-assessment.json";
import cddIndividuals from "@/data/regulations/aml-ctf-rules/processes/cdd-individuals.json";
import cddCompanies from "@/data/regulations/aml-ctf-rules/processes/cdd-companies.json";
import cddTrusts from "@/data/regulations/aml-ctf-rules/processes/cdd-trusts.json";
import cddPartnerships from "@/data/regulations/aml-ctf-rules/processes/cdd-partnerships.json";
import cddAssociations from "@/data/regulations/aml-ctf-rules/processes/cdd-associations.json";
import cddCooperatives from "@/data/regulations/aml-ctf-rules/processes/cdd-cooperatives.json";
import cddGovernment from "@/data/regulations/aml-ctf-rules/processes/cdd-government.json";
import verificationDocuments from "@/data/regulations/aml-ctf-rules/processes/verification-documents.json";
import verificationElectronic from "@/data/regulations/aml-ctf-rules/processes/verification-electronic.json";
import agentManagement from "@/data/regulations/aml-ctf-rules/processes/agent-management.json";
import beneficialOwnership from "@/data/regulations/aml-ctf-rules/processes/beneficial-ownership.json";
import pepScreening from "@/data/regulations/aml-ctf-rules/processes/pep-screening.json";
import recordKeeping from "@/data/regulations/aml-ctf-rules/processes/record-keeping.json";
import alternativeId from "@/data/regulations/aml-ctf-rules/processes/alternative-id.json";

const MERMAID_DIAGRAM = `flowchart TD
    A[Customer Targeting]
    B@{ shape: procs, label: "Onboarding"}
    C@{ shape: procs, label: "Verification"}
    D[Beneficial Owner Assessment]
    E[Politically Exposed Person Assessment]
    F[AML CTF Risk Assessment]
    G[Provision of Services]
    I[AML CTF Risk Assessment]
    J[High Value Transaction Reporting]
    K[Suspicious Matter Reporting]

    A -->|Service Commencement| B
    subgraph Z[Extended CDD]
      D
      E
    end
    subgraph Y[Customer Due Diligence]
      B
      C
      F
    end
    subgraph H[Ongoing CDD]
      I
      J
      K
    end
    B --> C --> F
    Y ---->|conditional| Z
    F --> G
    G --> H
`;

export const amlCTFContent: RegulationContent = {
  introduction: introductionJson as unknown as RegulationContent["introduction"],
  sectionForms: {
    "4_1":  riskAssessment as unknown as ProcessForm,
    "4_2":  cddIndividuals as unknown as ProcessForm,
    "4_3":  cddCompanies as unknown as ProcessForm,
    "4_4":  cddTrusts as unknown as ProcessForm,
    "4_5":  cddPartnerships as unknown as ProcessForm,
    "4_6":  cddAssociations as unknown as ProcessForm,
    "4_7":  cddCooperatives as unknown as ProcessForm,
    "4_8":  cddGovernment as unknown as ProcessForm,
    "4_9":  verificationDocuments as unknown as ProcessForm,
    "4_10": verificationElectronic as unknown as ProcessForm,
    "4_11": agentManagement as unknown as ProcessForm,
    "4_12": beneficialOwnership as unknown as ProcessForm,
    "4_13": pepScreening as unknown as ProcessForm,
    "4_14": recordKeeping as unknown as ProcessForm,
    "4_15": alternativeId as unknown as ProcessForm,
  },
  manifest: {
    pdfUrl: "/chapter4.pdf",
    mermaidDiagram: MERMAID_DIAGRAM,
    hasIntroductionForm: true,
    sectionGating: {
      "4_1":  null,
      "4_2":  "4_1_4_1",
      "4_3":  "4_1_4_2",
      "4_4":  "4_1_4_3",
      "4_5":  "4_1_4_4",
      "4_6":  "4_1_4_5",
      "4_7":  "4_1_4_6",
      "4_8":  "4_1_4_7",
      "4_9":  null,
      "4_10": null,
      "4_11": "4_1_8",
      "4_12": "4_1_5_1",
      "4_13": "4_1_5_2",
      "4_14": null,
      "4_15": null,
    },
  },
};

// Section ID → process slug mapping (used for feedback lookup)
export const AML_SECTION_TO_PROCESS: Record<string, string> = {
  "4_1":  "risk-assessment",
  "4_2":  "cdd-individuals",
  "4_3":  "cdd-companies",
  "4_4":  "cdd-trusts",
  "4_5":  "cdd-partnerships",
  "4_6":  "cdd-associations",
  "4_7":  "cdd-cooperatives",
  "4_8":  "cdd-government",
  "4_9":  "verification-documents",
  "4_10": "verification-electronic",
  "4_11": "agent-management",
  "4_12": "beneficial-ownership",
  "4_13": "pep-screening",
  "4_14": "record-keeping",
  "4_15": "alternative-id",
};

// Process slug → section ID (reverse of AML_SECTION_TO_PROCESS)
export const AML_PROCESS_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(AML_SECTION_TO_PROCESS).map(([sectionId, slug]) => [slug, sectionId]),
);

// Canonical process titles
export const AML_PROCESS_TITLES: Record<string, string> = {
  "risk-assessment":         "ML/TF Risk Assessment",
  "cdd-individuals":         "Customer Due Diligence — Individuals",
  "cdd-companies":           "Customer Due Diligence — Companies",
  "cdd-trusts":              "Customer Due Diligence — Trusts",
  "cdd-partnerships":        "Customer Due Diligence — Partnerships",
  "cdd-associations":        "Customer Due Diligence — Associations",
  "cdd-cooperatives":        "Customer Due Diligence — Co-operatives",
  "cdd-government":          "Customer Due Diligence — Government Bodies",
  "verification-documents":  "Verification Standards — Documents",
  "verification-electronic": "Verification Standards — Electronic",
  "agent-management":        "Agent Management",
  "beneficial-ownership":    "Beneficial Ownership",
  "pep-screening":           "PEP Screening",
  "record-keeping":          "Record Keeping",
  "alternative-id":          "Alternative Identity Proofing",
};
