import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Regulation,
  ActiveRegulation,
  BusinessProfile,
  TeamMember,
  ComplianceEvent,
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
}

function recomputeProcesses(al: ActiveRegulation): ActiveRegulation {
  return {
    ...al,
    processes: computeProcessesFromAnswers(al.sectionAnswers).map((p) => {
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
        const sectionAnswers: Record<string, Record<string, string>> = {
          "4_1": introAnswers,
        };
        const newActive: ActiveRegulation = {
          regulationId: id,
          activatedAt: new Date().toISOString(),
          businessProfile: profile,
          sectionAnswers,
          processes: computeProcessesFromAnswers(sectionAnswers),
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
            const updated = {
              ...al,
              sectionAnswers: {
                ...al.sectionAnswers,
                [sectionId]: answers,
              },
            };
            return recomputeProcesses(updated);
          }),
        }));
      },

      getSectionAnswers: (regulationId, sectionId) => {
        const al = get().activeRegulations.find(
          (a) => a.regulationId === regulationId,
        );
        return al?.sectionAnswers?.[sectionId] || {};
      },

      clearSectionAnswers: (regulationId, sectionId) => {
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            const { [sectionId]: _, ...rest } = al.sectionAnswers;
            const updated = { ...al, sectionAnswers: rest };
            return recomputeProcesses(updated);
          }),
        }));
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
    }),
    { name: "compliance-storage" },
  ),
);
