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
}

export interface LegislationSection {
  id: string;
  partNumber: string;
  title: string;
  description?: string;
}

export interface LegislationProcess {
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

export interface Legislation {
  id: string;
  name: string;
  shortName: string;
  agency: string;
  jurisdiction: string;
  description: string;
  applicableServices: string[];
  sections: LegislationSection[];
  processes: LegislationProcess[];
}

export interface BusinessProfile {
  businessName: string;
  location: string;
  foundingYear: number;
  employeeCount: number;
  services: string[];
}

export interface ActiveLegislation {
  legislationId: string;
  activatedAt: string;
  businessProfile: BusinessProfile;
  sectionAnswers: Record<string, Record<string, string>>;
  processes: BusinessProcess[];
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
