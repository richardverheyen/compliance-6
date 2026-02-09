import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Legislation,
  ActiveLegislation,
  BusinessProfile,
  TeamMember,
  ComplianceEvent,
} from "@/lib/types/compliance";

interface ComplianceState {
  legislations: Legislation[];
  activeLegislations: ActiveLegislation[];
  teamMembers: TeamMember[];
  calendarEvents: ComplianceEvent[];
  isLoading: boolean;

  fetchLegislations: () => Promise<void>;
  getLegislation: (id: string) => Legislation | undefined;
  activateLegislation: (id: string, profile: BusinessProfile) => Promise<void>;
  getActiveLegislation: (id: string) => ActiveLegislation | undefined;
  hasActiveLegislations: () => boolean;

  fetchTeam: () => Promise<void>;
  addTeamMember: (member: { name: string; email: string; role: string }) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  getTeamMember: (id: string) => TeamMember | undefined;

  fetchCalendarEvents: () => Promise<void>;

  assignProcessOwner: (legislationId: string, processId: string, ownerId: string) => void;
}

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set, get) => ({
      legislations: [],
      activeLegislations: [],
      teamMembers: [],
      calendarEvents: [],
      isLoading: false,

      fetchLegislations: async () => {
        set({ isLoading: true });
        const res = await fetch("/api/compliance/legislations");
        const data = await res.json();
        set({ legislations: data, isLoading: false });
      },

      getLegislation: (id) => {
        return get().legislations.find((l) => l.id === id);
      },

      activateLegislation: async (id, profile) => {
        set({ isLoading: true });
        const res = await fetch(`/api/compliance/legislations/${id}/activate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        const active: ActiveLegislation = await res.json();
        set((state) => ({
          activeLegislations: [
            ...state.activeLegislations.filter((a) => a.legislationId !== id),
            active,
          ],
          isLoading: false,
        }));
      },

      getActiveLegislation: (id) => {
        return get().activeLegislations.find((a) => a.legislationId === id);
      },

      hasActiveLegislations: () => {
        return get().activeLegislations.length > 0;
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

      getTeamMember: (id) => {
        return get().teamMembers.find((m) => m.id === id);
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
    }),
    { name: "compliance-storage" },
  ),
);
