import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Regulation,
  ActiveRegulation,
  SelfAssessment,
  BusinessProfile,
  TeamMember,
  ComplianceEvent,
  Reminder,
} from "@/lib/types/compliance";
import { computeProcessesFromAnswers } from "@/mocks/compliance-data";
import { useAuthStore } from "@/lib/auth-store";

interface ComplianceState {
  regulations: Regulation[];
  activeRegulations: ActiveRegulation[];
  teamMembers: TeamMember[];
  calendarEvents: ComplianceEvent[];
  isLoading: boolean;
  processAssignments: Record<string, string>; // processId -> teamMemberId

  fetchRegulations: () => Promise<void>;
  getRegulation: (id: string) => Regulation | undefined;
  getActiveRegulation: (id: string) => ActiveRegulation | undefined;
  hasActiveRegulations: () => boolean;

  // Section-based activation & answers
  activateRegulation: (id: string, profile: BusinessProfile, introAnswers: Record<string, string>) => void;
  saveSectionAnswers: (regulationId: string, sectionId: string, answers: Record<string, string>) => void;
  getSectionAnswers: (regulationId: string, sectionId: string) => Record<string, string>;
  clearSectionAnswers: (regulationId: string, sectionId: string) => void;

  // Self assessment actions
  startSelfAssessment: (regulationId: string, introAnswers: Record<string, string>) => void;
  completeSelfAssessment: (regulationId: string, completedBy: string) => void;
  getActiveAssessment: (regulationId: string) => SelfAssessment | undefined;
  getLastCompletedAssessment: (regulationId: string) => SelfAssessment | undefined;

  // Team
  fetchTeam: () => Promise<void>;
  addTeamMember: (member: { name: string; email: string; role: string }) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  getTeamMember: (id: string) => TeamMember | undefined;
  getTeamMembersWithAuth: () => TeamMember[];

  fetchCalendarEvents: () => Promise<void>;
  assignProcessOwner: (regulationId: string, processId: string, ownerId: string) => void;

  // Regulation process assignments
  assignRegulationProcessOwner: (processId: string, teamMemberId: string) => void;
  unassignRegulationProcessOwner: (processId: string) => void;
  getRegulationProcessOwner: (processId: string) => string | undefined;

  // Reminders
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, "id">) => void;
  deleteReminder: (id: string) => void;
  getRemindersForKeyDate: (keyDateId: string) => Reminder[];
}

function getAssessmentSectionAnswers(al: ActiveRegulation): Record<string, Record<string, string>> {
  const active = al.selfAssessments.find((s) => s.id === al.activeAssessmentId);
  if (active) return active.sectionAnswers;
  const completed = [...al.selfAssessments]
    .filter((s) => s.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  return completed[0]?.sectionAnswers ?? {};
}

function recomputeProcesses(al: ActiveRegulation): ActiveRegulation {
  const sectionAnswers = getAssessmentSectionAnswers(al);
  return {
    ...al,
    processes: computeProcessesFromAnswers(sectionAnswers).map((p) => {
      // Preserve existing owner assignments
      const existing = al.processes.find((ep) => ep.id === p.id);
      return existing ? { ...p, ownerId: existing.ownerId } : p;
    }),
  };
}

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set, get) => ({
      regulations: [],
      activeRegulations: [],
      teamMembers: [],
      calendarEvents: [],
      isLoading: false,
      processAssignments: {},
      reminders: [],

      fetchRegulations: async () => {
        set({ isLoading: true });
        const res = await fetch("/api/compliance/regulations");
        const data = await res.json();
        set({ regulations: data, isLoading: false });
      },

      getRegulation: (id) => get().regulations.find((l) => l.id === id),

      getActiveRegulation: (id) =>
        get().activeRegulations.find((a) => a.regulationId === id),

      hasActiveRegulations: () => get().activeRegulations.length > 0,

      activateRegulation: (id, profile, introAnswers) => {
        const firstAssessment: SelfAssessment = {
          id: Date.now().toString(),
          regulationId: id,
          status: "in_progress",
          startedAt: new Date().toISOString(),
          sectionAnswers: { "risk-assessment": introAnswers },
        };
        const newActive: ActiveRegulation = {
          regulationId: id,
          activatedAt: new Date().toISOString(),
          businessProfile: profile,
          selfAssessments: [firstAssessment],
          activeAssessmentId: firstAssessment.id,
          processes: computeProcessesFromAnswers({ "risk-assessment": introAnswers }),
        };
        set((state) => ({
          activeRegulations: [
            ...state.activeRegulations.filter((a) => a.regulationId !== id),
            newActive,
          ],
        }));
      },

      saveSectionAnswers: (regulationId, sectionId, answers) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            if (!al.activeAssessmentId) return al;
            const updatedAssessments = al.selfAssessments.map((s) => {
              if (s.id !== al.activeAssessmentId) return s;
              return { ...s, sectionAnswers: { ...s.sectionAnswers, [sectionId]: answers } };
            });
            const updated = { ...al, selfAssessments: updatedAssessments };
            return recomputeProcesses(updated);
          }),
        }));
      },

      getSectionAnswers: (regulationId, sectionId) => {
        const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
        if (!al) return {};
        return getAssessmentSectionAnswers(al)[sectionId] ?? {};
      },

      clearSectionAnswers: (regulationId, sectionId) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            if (!al.activeAssessmentId) return al;
            const updatedAssessments = al.selfAssessments.map((s) => {
              if (s.id !== al.activeAssessmentId) return s;
              const { [sectionId]: _, ...rest } = s.sectionAnswers;
              return { ...s, sectionAnswers: rest };
            });
            const updated = { ...al, selfAssessments: updatedAssessments };
            return recomputeProcesses(updated);
          }),
        }));
      },

      startSelfAssessment: (regulationId, introAnswers) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            const newAssessment: SelfAssessment = {
              id: Date.now().toString(),
              regulationId,
              status: "in_progress",
              startedAt: new Date().toISOString(),
              sectionAnswers: { "risk-assessment": introAnswers },
            };
            const updated = {
              ...al,
              selfAssessments: [...al.selfAssessments, newAssessment],
              activeAssessmentId: newAssessment.id,
            };
            return recomputeProcesses(updated);
          }),
        }));
      },

      completeSelfAssessment: (regulationId, completedBy) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            if (!al.activeAssessmentId) return al;
            const updatedAssessments = al.selfAssessments.map((s) => {
              if (s.id !== al.activeAssessmentId) return s;
              return {
                ...s,
                status: "completed" as const,
                completedAt: new Date().toISOString(),
                completedBy,
              };
            });
            const updated = {
              ...al,
              selfAssessments: updatedAssessments,
              activeAssessmentId: null,
            };
            return recomputeProcesses(updated);
          }),
        }));
      },

      getActiveAssessment: (regulationId) => {
        const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
        if (!al || !al.activeAssessmentId) return undefined;
        return al.selfAssessments.find((s) => s.id === al.activeAssessmentId);
      },

      getLastCompletedAssessment: (regulationId) => {
        const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
        if (!al) return undefined;
        const completed = [...al.selfAssessments]
          .filter((s) => s.status === "completed")
          .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
        return completed[0];
      },

      fetchTeam: async () => {
        const res = await fetch("/api/compliance/team");
        const data = await res.json();
        set({ teamMembers: data });
      },

      addTeamMember: async (member) => {
        const res = await fetch("/api/compliance/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(member),
        });
        const newMember: TeamMember = await res.json();
        set((state) => ({ teamMembers: [...state.teamMembers, newMember] }));
      },

      removeTeamMember: async (id) => {
        await fetch(`/api/compliance/team/${id}`, { method: "DELETE" });
        set((state) => ({
          teamMembers: state.teamMembers.filter((m) => m.id !== id),
        }));
      },

      getTeamMember: (id) => get().teamMembers.find((m) => m.id === id),

      getTeamMembersWithAuth: () => {
        const members = get().teamMembers;
        const user = useAuthStore.getState().user;
        if (!user || members.some((m) => m.email === user.email)) {
          return members;
        }
        const authMember: TeamMember = {
          id: `auth-${user.id}`,
          name: user.name,
          email: user.email,
          role: "Account Owner",
          avatarColor: "bg-violet-500",
        };
        return [...members, authMember];
      },

      fetchCalendarEvents: async () => {
        const res = await fetch("/api/compliance/calendar");
        const data = await res.json();
        set({ calendarEvents: data });
      },

      assignProcessOwner: (regulationId, processId, ownerId) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            return {
              ...al,
              processes: al.processes.map((p) =>
                p.id === processId ? { ...p, ownerId } : p,
              ),
            };
          }),
        }));
      },

      assignRegulationProcessOwner: (processId, teamMemberId) => {
        set((state) => ({
          processAssignments: { ...state.processAssignments, [processId]: teamMemberId },
        }));
      },

      unassignRegulationProcessOwner: (processId) => {
        set((state) => {
          const { [processId]: _, ...rest } = state.processAssignments;
          return { processAssignments: rest };
        });
      },

      getRegulationProcessOwner: (processId) => get().processAssignments[processId],

      addReminder: (r) => {
        const reminder: Reminder = { ...r, id: Date.now().toString() };
        set((state) => ({ reminders: [...state.reminders, reminder] }));
      },

      deleteReminder: (id) => {
        set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
      },

      getRemindersForKeyDate: (keyDateId) =>
        get().reminders.filter((r) => r.keyDateId === keyDateId),
    }),
    { name: "compliance-storage-v2" },
  ),
);
