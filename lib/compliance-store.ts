import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Legislation,
  ActiveLegislation,
  BusinessProfile,
  TeamMember,
  ComplianceEvent,
} from "@/lib/types/compliance";
import { computeProcessesFromAnswers } from "@/mocks/compliance-data";
import { useAuthStore } from "@/lib/auth-store";

interface ComplianceState {
  legislations: Legislation[];
  activeLegislations: ActiveLegislation[];
  teamMembers: TeamMember[];
  calendarEvents: ComplianceEvent[];
  isLoading: boolean;
  processAssignments: Record<string, string>; // processId -> teamMemberId

  fetchLegislations: () => Promise<void>;
  getLegislation: (id: string) => Legislation | undefined;
  getActiveLegislation: (id: string) => ActiveLegislation | undefined;
  hasActiveLegislations: () => boolean;

  // Section-based activation & answers
  activateLegislation: (id: string, profile: BusinessProfile, introAnswers: Record<string, string>) => void;
  saveSectionAnswers: (legislationId: string, sectionId: string, answers: Record<string, string>) => void;
  getSectionAnswers: (legislationId: string, sectionId: string) => Record<string, string>;
  clearSectionAnswers: (legislationId: string, sectionId: string) => void;

  // Team
  fetchTeam: () => Promise<void>;
  addTeamMember: (member: { name: string; email: string; role: string }) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  getTeamMember: (id: string) => TeamMember | undefined;
  getTeamMembersWithAuth: () => TeamMember[];

  fetchCalendarEvents: () => Promise<void>;
  assignProcessOwner: (legislationId: string, processId: string, ownerId: string) => void;

  // Legislation process assignments
  assignLegislationProcessOwner: (processId: string, teamMemberId: string) => void;
  unassignLegislationProcessOwner: (processId: string) => void;
  getLegislationProcessOwner: (processId: string) => string | undefined;
}

function recomputeProcesses(al: ActiveLegislation): ActiveLegislation {
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
      legislations: [],
      activeLegislations: [],
      teamMembers: [],
      calendarEvents: [],
      isLoading: false,
      processAssignments: {},

      fetchLegislations: async () => {
        set({ isLoading: true });
        const res = await fetch("/api/compliance/legislations");
        const data = await res.json();
        set({ legislations: data, isLoading: false });
      },

      getLegislation: (id) => get().legislations.find((l) => l.id === id),

      getActiveLegislation: (id) =>
        get().activeLegislations.find((a) => a.legislationId === id),

      hasActiveLegislations: () => get().activeLegislations.length > 0,

      activateLegislation: (id, profile, introAnswers) => {
        const sectionAnswers: Record<string, Record<string, string>> = {
          "4_1": introAnswers,
        };
        const newActive: ActiveLegislation = {
          legislationId: id,
          activatedAt: new Date().toISOString(),
          businessProfile: profile,
          sectionAnswers,
          processes: computeProcessesFromAnswers(sectionAnswers),
        };
        set((state) => ({
          activeLegislations: [
            ...state.activeLegislations.filter((a) => a.legislationId !== id),
            newActive,
          ],
        }));
      },

      saveSectionAnswers: (legislationId, sectionId, answers) => {
        set((state) => ({
          activeLegislations: state.activeLegislations.map((al) => {
            if (al.legislationId !== legislationId) return al;
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

      getSectionAnswers: (legislationId, sectionId) => {
        const al = get().activeLegislations.find(
          (a) => a.legislationId === legislationId,
        );
        return al?.sectionAnswers?.[sectionId] || {};
      },

      clearSectionAnswers: (legislationId, sectionId) => {
        set((state) => ({
          activeLegislations: state.activeLegislations.map((al) => {
            if (al.legislationId !== legislationId) return al;
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

      assignProcessOwner: (legislationId, processId, ownerId) => {
        set((state) => ({
          activeLegislations: state.activeLegislations.map((al) => {
            if (al.legislationId !== legislationId) return al;
            return {
              ...al,
              processes: al.processes.map((p) =>
                p.id === processId ? { ...p, ownerId } : p,
              ),
            };
          }),
        }));
      },

      assignLegislationProcessOwner: (processId, teamMemberId) => {
        set((state) => ({
          processAssignments: { ...state.processAssignments, [processId]: teamMemberId },
        }));
      },

      unassignLegislationProcessOwner: (processId) => {
        set((state) => {
          const { [processId]: _, ...rest } = state.processAssignments;
          return { processAssignments: rest };
        });
      },

      getLegislationProcessOwner: (processId) => get().processAssignments[processId],
    }),
    { name: "compliance-storage" },
  ),
);
