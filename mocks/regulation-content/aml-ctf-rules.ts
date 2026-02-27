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

type GroupJson = { variant?: string; description?: string };

function mainDesc(form: { groups?: GroupJson[] }): string | undefined {
  const g = form.groups?.find((g) => g.variant === "main") ?? form.groups?.[0];
  return g?.description;
}

const MERMAID_DIAGRAM = `flowchart TD
    A[Customer Targeting]
    B@{ shape: procs, label: "Customer Onboarding"}
    C@{ shape: procs, label: "Customer Verification"}
    D[Beneficial Owner Assessment]
    E[Politically Exposed Person Assessment]
    G[Provision of Services]
    I{AML CTF Risk Assessment}
    J[High Value Transaction Report to AUSTRAC]
    K[Suspicious Matter Report to AUSTRAC]

    A -->|Service Commencement| B
    subgraph Z[Extended CDD]
      J
      K
    end
    subgraph Y[Customer Due Diligence]
      B
      C
      B --> D
      B --> E
    end
    subgraph H[Ongoing CDD]
      G --> I
    end
    Y ----> H
    B --> C
    I -->|High-Risk Events| Z
`;

export const amlCTFContent: RegulationContent = {
  introduction: introductionJson as unknown as RegulationContent["introduction"],
  processForms: {
    "risk-assessment":         riskAssessment as unknown as ProcessForm,
    "cdd-individuals":         cddIndividuals as unknown as ProcessForm,
    "cdd-companies":           cddCompanies as unknown as ProcessForm,
    "cdd-trusts":              cddTrusts as unknown as ProcessForm,
    "cdd-partnerships":        cddPartnerships as unknown as ProcessForm,
    "cdd-associations":        cddAssociations as unknown as ProcessForm,
    "cdd-cooperatives":        cddCooperatives as unknown as ProcessForm,
    "cdd-government":          cddGovernment as unknown as ProcessForm,
    "verification-documents":  verificationDocuments as unknown as ProcessForm,
    "verification-electronic": verificationElectronic as unknown as ProcessForm,
    "agent-management":        agentManagement as unknown as ProcessForm,
    "beneficial-ownership":    beneficialOwnership as unknown as ProcessForm,
    "pep-screening":           pepScreening as unknown as ProcessForm,
    "alternative-id":          alternativeId as unknown as ProcessForm,
  },
  manifest: {
    pdfUrl: "/chapter4_linked.pdf",
    mermaidDiagram: MERMAID_DIAGRAM,
    hasIntroductionForm: true,
    processList: [
      { id: "risk-assessment",         title: "ML/TF Risk Assessment",                    description: mainDesc(riskAssessment),         gatedBy: null },
      { id: "cdd-individuals",         title: "Customer Due Diligence — Individuals",      description: mainDesc(cddIndividuals),         gatedBy: "4_1_4_1" },
      { id: "cdd-companies",           title: "Customer Due Diligence — Companies",         description: mainDesc(cddCompanies),           gatedBy: "4_1_4_2" },
      { id: "cdd-trusts",              title: "Customer Due Diligence — Trusts",            description: mainDesc(cddTrusts),              gatedBy: "4_1_4_3" },
      { id: "cdd-partnerships",        title: "Customer Due Diligence — Partnerships",      description: mainDesc(cddPartnerships),        gatedBy: "4_1_4_4" },
      { id: "cdd-associations",        title: "Customer Due Diligence — Associations",      description: mainDesc(cddAssociations),        gatedBy: "4_1_4_5" },
      { id: "cdd-cooperatives",        title: "Customer Due Diligence — Co-operatives",     description: mainDesc(cddCooperatives),        gatedBy: "4_1_4_6" },
      { id: "cdd-government",          title: "Customer Due Diligence — Government Bodies", description: mainDesc(cddGovernment),          gatedBy: "4_1_4_7" },
      { id: "verification-documents",  title: "Verification Standards — Documents",         description: mainDesc(verificationDocuments),  gatedBy: null },
      { id: "verification-electronic", title: "Verification Standards — Electronic",        description: mainDesc(verificationElectronic), gatedBy: null },
      { id: "agent-management",        title: "Agent Management",                           description: mainDesc(agentManagement),        gatedBy: "4_1_8" },
      { id: "beneficial-ownership",    title: "Beneficial Ownership",                       description: mainDesc(beneficialOwnership),    gatedBy: "4_1_5_1" },
      { id: "pep-screening",           title: "PEP Screening",                              description: mainDesc(pepScreening),           gatedBy: "4_1_5_2" },
      { id: "alternative-id",          title: "Alternative Identity Proofing",              description: mainDesc(alternativeId),          gatedBy: null },
    ],
  },
};
