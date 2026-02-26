export type ComplianceRating = "red" | "yellow" | "green";

export interface ComplianceStep {
  id: string;
  title: string;
  rating: ComplianceRating;
}

export interface BusinessProcess {
  id: string;
  title: string;
  steps: ComplianceStep[];
  ownerId?: string;
  lastUpdated: string;
  confirmed?: boolean;
}

export interface RegulationProcess {
  id: string;
  name: string;
  description: string;
  businessObjective: string;
  parentId?: string;
  ownerId?: string;
  frequency: string;
  frequencyPer: string;
  frequencyDetail: string;
  frequencyLabel: string;
}

export interface Regulation {
  id: string;
  name: string;
  shortName: string;
  agency: string;
  jurisdiction: string;
  description: string;
  applicableServices: string[];
  processes: RegulationProcess[];
}

export interface BusinessProfile {
  businessName: string;
  location: string;
  foundingYear: number;
  employeeCount: number;
  services: string[];
}

export interface SelfAssessment {
  id: string;
  regulationId: string;
  status: "in_progress" | "completed";
  startedAt: string;
  completedAt?: string;
  completedBy?: string;
  sectionAnswers: Record<string, Record<string, string>>;
}

export interface ActiveRegulation {
  regulationId: string;
  activatedAt: string;
  businessProfile: BusinessProfile;
  processes: BusinessProcess[];
  selfAssessments: SelfAssessment[];
  activeAssessmentId: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

export interface ComplianceEvent {
  date: string;
  title: string;
  agency: string;
  description: string;
}

export function getProcessRating(process: BusinessProcess): ComplianceRating {
  if (process.steps.some((s) => s.rating === "red")) return "red";
  if (process.steps.some((s) => s.rating === "yellow")) return "yellow";
  return "green";
}
