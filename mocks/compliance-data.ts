import type {
  Legislation,
  BusinessProcess,
  ComplianceRating,
  TeamMember,
  ComplianceEvent,
} from "@/lib/types/compliance";

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
    requirements: [
      {
        id: "req-cid",
        title: "Customer Identification & Verification",
        stepTitles: [
          "Collect customer identification data",
          "Verify customer identity documents",
          "Screen against sanctions lists",
          "Determine beneficial ownership",
          "Assess customer risk profile",
          "Record keeping for identification",
          "Periodic re-verification schedule",
          "Enhanced due diligence for high-risk customers",
        ],
      },
      {
        id: "req-smr",
        title: "Suspicious Matter Reporting & Record Keeping",
        stepTitles: [
          "Define suspicious matter indicators",
          "Implement transaction monitoring",
          "Establish internal escalation process",
          "File suspicious matter reports with AUSTRAC",
          "Maintain transaction records for 7 years",
          "Staff training on reporting obligations",
          "Annual compliance program review",
        ],
      },
    ],
  },
];

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

const ratings: ComplianceRating[] = ["red", "yellow", "green"];

function randomDate(): string {
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function generateMockRatings(legislation: Legislation): BusinessProcess[] {
  return legislation.requirements.map((req) => ({
    id: req.id,
    title: req.title,
    ownerId: mockTeamMembers[Math.floor(Math.random() * mockTeamMembers.length)].id,
    lastUpdated: randomDate(),
    steps: req.stepTitles.map((title, i) => ({
      id: `${req.id}-step-${i}`,
      title,
      rating: ratings[Math.floor(Math.random() * ratings.length)],
    })),
  }));
}
