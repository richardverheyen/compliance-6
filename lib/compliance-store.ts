import { create } from "zustand";
import type {
  Regulation,
  ActiveRegulation,
  OrgProfile,
  SelfAssessment,
  TeamMember,
  PendingInvitation,
  ComplianceEvent,
  Reminder,
} from "@/lib/types/compliance";
import { computeProcessesFromAnswers } from "@/lib/process-computation";

interface ComplianceState {
  regulations: Regulation[];
  activeRegulations: ActiveRegulation[];
  orgProfile: OrgProfile | null;
  teamMembers: TeamMember[];
  pendingInvitations: PendingInvitation[];
  calendarEvents: ComplianceEvent[];
  isLoading: boolean;
  processAssignments: Record<string, string>; // processId -> teamMemberId
  reminders: Reminder[];

  // Load all user data from API
  initialize: () => Promise<void>;

  getRegulation: (id: string) => Regulation | undefined;
  getActiveRegulation: (id: string) => ActiveRegulation | undefined;
  hasActiveRegulations: () => boolean;

  // Section-based activation & answers
  activateRegulation: (id: string, introAnswers: Record<string, string>) => Promise<void>;
  saveSectionAnswers: (regulationId: string, sectionId: string, answers: Record<string, string>) => Promise<void>;
  getSectionAnswers: (regulationId: string, sectionId: string) => Record<string, string>;
  clearSectionAnswers: (regulationId: string, sectionId: string) => Promise<void>;

  // Self assessment actions
  startSelfAssessment: (regulationId: string, introAnswers: Record<string, string>) => Promise<void>;
  completeSelfAssessment: (regulationId: string, completedBy: string) => Promise<void>;
  getActiveAssessment: (regulationId: string) => SelfAssessment | undefined;
  getLastCompletedAssessment: (regulationId: string) => SelfAssessment | undefined;

  // Team
  addTeamMember: (member: { email: string; role?: string; orgRole?: "org:admin" | "org:member" }) => Promise<void>;
  removeTeamMember: (id: string) => Promise<void>;
  updateMemberOrgRole: (memberId: string, orgRole: "org:admin" | "org:member") => Promise<void>;
  getTeamMember: (id: string) => TeamMember | undefined;
  getTeamMembersWithAuth: () => TeamMember[];

  assignProcessOwner: (regulationId: string, processId: string, ownerId: string) => void;

  // Regulation process assignments
  assignRegulationProcessOwner: (processId: string, teamMemberId: string) => Promise<void>;
  unassignRegulationProcessOwner: (processId: string) => Promise<void>;
  getRegulationProcessOwner: (processId: string) => string | undefined;

  // Reminders
  addReminder: (r: Omit<Reminder, "id">) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
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
      const existing = al.processes.find((ep) => ep.id === p.id);
      return existing ? { ...p, ownerId: existing.ownerId } : p;
    }),
  };
}

export const useComplianceStore = create<ComplianceState>()(
  (set, get) => ({
    regulations: [],
    activeRegulations: [],
    orgProfile: null,
    teamMembers: [],
    pendingInvitations: [],
    calendarEvents: [],
    isLoading: false,
    processAssignments: {},
    reminders: [],

    initialize: async () => {
      set({ isLoading: true });
      try {
        const [regsRes, arRes, teamRes, calRes, paRes, remRes, orgRes] = await Promise.all([
          fetch("/api/compliance/regulations"),
          fetch("/api/compliance/active-regulations"),
          fetch("/api/compliance/team"),
          fetch("/api/compliance/calendar"),
          fetch("/api/compliance/process-assignments"),
          fetch("/api/compliance/reminders"),
          fetch("/api/organisation"),
        ]);

        const [regulations, activeRegulationsRaw, teamData, calendarEvents, processAssignments, reminders, orgProfile] =
          await Promise.all([
            regsRes.ok ? regsRes.json() : [],
            arRes.ok ? arRes.json() : [],
            teamRes.ok ? teamRes.json() : { members: [], pending: [] },
            calRes.ok ? calRes.json() : [],
            paRes.ok ? paRes.json() : {},
            remRes.ok ? remRes.json() : [],
            orgRes.ok ? orgRes.json() : null,
          ]);

        // Recompute processes client-side for each active regulation
        const activeRegulations: ActiveRegulation[] = (activeRegulationsRaw as ActiveRegulation[]).map(
          (al) => recomputeProcesses(al),
        );

        set({
          regulations,
          activeRegulations,
          orgProfile: orgProfile ?? null,
          teamMembers: teamData.members ?? [],
          pendingInvitations: teamData.pending ?? [],
          calendarEvents,
          processAssignments,
          reminders,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    getRegulation: (id) => get().regulations.find((l) => l.id === id),

    getActiveRegulation: (id) =>
      get().activeRegulations.find((a) => a.regulationId === id),

    hasActiveRegulations: () => get().activeRegulations.length > 0,

    activateRegulation: async (id, introAnswers) => {
      // Optimistic update
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

      try {
        const res = await fetch("/api/compliance/active-regulations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regulationId: id, introAnswers }),
        });
        if (!res.ok) throw new Error("Failed");
        const serverData = await res.json() as ActiveRegulation;
        // Replace optimistic entry with server data
        set((state) => ({
          activeRegulations: state.activeRegulations.map((a) =>
            a.regulationId === id ? recomputeProcesses({ ...serverData, processes: [] }) : a,
          ),
        }));
      } catch {
        // On failure re-fetch
        get().initialize();
      }
    },

    saveSectionAnswers: async (regulationId, sectionId, answers) => {
      const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
      if (!al?.activeAssessmentId) return;
      const assessmentId = al.activeAssessmentId;

      // Optimistic local update
      set((state) => ({
        activeRegulations: state.activeRegulations.map((ar) => {
          if (ar.regulationId !== regulationId) return ar;
          if (!ar.activeAssessmentId) return ar;
          const updatedAssessments = ar.selfAssessments.map((s) => {
            if (s.id !== ar.activeAssessmentId) return s;
            return { ...s, sectionAnswers: { ...s.sectionAnswers, [sectionId]: answers } };
          });
          return recomputeProcesses({ ...ar, selfAssessments: updatedAssessments });
        }),
      }));

      try {
        await fetch(
          `/api/compliance/active-regulations/${regulationId}/assessments/${assessmentId}/section-answers/${sectionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(answers),
          },
        );
      } catch {
        get().initialize();
      }
    },

    getSectionAnswers: (regulationId, sectionId) => {
      const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
      if (!al) return {};
      return getAssessmentSectionAnswers(al)[sectionId] ?? {};
    },

    clearSectionAnswers: async (regulationId, sectionId) => {
      const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
      if (!al?.activeAssessmentId) return;
      const assessmentId = al.activeAssessmentId;

      set((state) => ({
        activeRegulations: state.activeRegulations.map((ar) => {
          if (ar.regulationId !== regulationId) return ar;
          if (!ar.activeAssessmentId) return ar;
          const updatedAssessments = ar.selfAssessments.map((s) => {
            if (s.id !== ar.activeAssessmentId) return s;
            const { [sectionId]: _, ...rest } = s.sectionAnswers;
            return { ...s, sectionAnswers: rest };
          });
          return recomputeProcesses({ ...ar, selfAssessments: updatedAssessments });
        }),
      }));

      try {
        await fetch(
          `/api/compliance/active-regulations/${regulationId}/assessments/${assessmentId}/section-answers/${sectionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          },
        );
      } catch {
        get().initialize();
      }
    },

    startSelfAssessment: async (regulationId, introAnswers) => {
      // Optimistic update
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

      try {
        const res = await fetch(
          `/api/compliance/active-regulations/${regulationId}/assessments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ introAnswers }),
          },
        );
        if (!res.ok) throw new Error("Failed");
        const serverAssessment = await res.json() as SelfAssessment;
        set((state) => ({
          activeRegulations: state.activeRegulations.map((al) => {
            if (al.regulationId !== regulationId) return al;
            // Replace the optimistic assessment with the server one
            const updatedAssessments = [
              ...al.selfAssessments.filter((s) => s.status !== "in_progress" || s.id === serverAssessment.id),
              { ...serverAssessment, sectionAnswers: serverAssessment.sectionAnswers ?? { "risk-assessment": introAnswers } },
            ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
            // Remove the old optimistic entry if different id
            const cleaned = al.selfAssessments.filter((s) => s.status !== "in_progress").concat(
              { ...serverAssessment, sectionAnswers: serverAssessment.sectionAnswers ?? { "risk-assessment": introAnswers } },
            );
            return recomputeProcesses({ ...al, selfAssessments: cleaned, activeAssessmentId: serverAssessment.id });
          }),
        }));
      } catch {
        get().initialize();
      }
    },

    completeSelfAssessment: async (regulationId, completedBy) => {
      const al = get().activeRegulations.find((a) => a.regulationId === regulationId);
      if (!al?.activeAssessmentId) return;
      const assessmentId = al.activeAssessmentId;
      const completedAt = new Date().toISOString();

      // Optimistic update
      set((state) => ({
        activeRegulations: state.activeRegulations.map((ar) => {
          if (ar.regulationId !== regulationId) return ar;
          if (!ar.activeAssessmentId) return ar;
          const updatedAssessments = ar.selfAssessments.map((s) => {
            if (s.id !== ar.activeAssessmentId) return s;
            return { ...s, status: "completed" as const, completedAt, completedBy };
          });
          return recomputeProcesses({ ...ar, selfAssessments: updatedAssessments, activeAssessmentId: null });
        }),
      }));

      try {
        await fetch(
          `/api/compliance/active-regulations/${regulationId}/assessments/${assessmentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed", completedAt, completedBy }),
          },
        );
      } catch {
        get().initialize();
      }
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

    addTeamMember: async (member) => {
      const res = await fetch("/api/compliance/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email, role: member.role, orgRole: member.orgRole }),
      });
      const newInvitation: PendingInvitation = await res.json();
      set((state) => ({ pendingInvitations: [...state.pendingInvitations, newInvitation] }));
    },

    removeTeamMember: async (id) => {
      await fetch(`/api/compliance/team/${id}`, { method: "DELETE" });
      if (id.startsWith("orginv_")) {
        set((state) => ({
          pendingInvitations: state.pendingInvitations.filter((inv) => inv.id !== id),
        }));
      } else {
        set((state) => ({
          teamMembers: state.teamMembers.filter((m) => m.id !== id),
        }));
      }
    },

    updateMemberOrgRole: async (memberId, orgRole) => {
      // Optimistic update
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.id === memberId ? { ...m, orgRole } : m,
        ),
      }));
      try {
        const res = await fetch(`/api/compliance/team/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgRole }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        get().initialize();
      }
    },

    getTeamMember: (id) => get().teamMembers.find((m) => m.id === id),

    getTeamMembersWithAuth: () => {
      return get().teamMembers;
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

    assignRegulationProcessOwner: async (processId, teamMemberId) => {
      set((state) => ({
        processAssignments: { ...state.processAssignments, [processId]: teamMemberId },
      }));
      try {
        await fetch(`/api/compliance/process-assignments/${processId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamMemberId }),
        });
      } catch {
        get().initialize();
      }
    },

    unassignRegulationProcessOwner: async (processId) => {
      set((state) => {
        const { [processId]: _, ...rest } = state.processAssignments;
        return { processAssignments: rest };
      });
      try {
        await fetch(`/api/compliance/process-assignments/${processId}`, {
          method: "DELETE",
        });
      } catch {
        get().initialize();
      }
    },

    getRegulationProcessOwner: (processId) => get().processAssignments[processId],

    addReminder: async (r) => {
      const optimisticId = Date.now().toString();
      const optimistic: Reminder = { ...r, id: optimisticId };
      set((state) => ({ reminders: [...state.reminders, optimistic] }));
      try {
        const res = await fetch("/api/compliance/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        if (!res.ok) throw new Error("Failed");
        const serverReminder: Reminder = await res.json();
        set((state) => ({
          reminders: state.reminders.map((rm) =>
            rm.id === optimisticId ? serverReminder : rm,
          ),
        }));
      } catch {
        get().initialize();
      }
    },

    deleteReminder: async (id) => {
      set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
      try {
        await fetch(`/api/compliance/reminders/${id}`, { method: "DELETE" });
      } catch {
        get().initialize();
      }
    },

    getRemindersForKeyDate: (keyDateId) =>
      get().reminders.filter((r) => r.keyDateId === keyDateId),
  }),
);
