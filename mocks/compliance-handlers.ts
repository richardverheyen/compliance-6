import { http, HttpResponse } from "msw";
import {
  regulationsCatalog,
  mockTeamMembers,
  complianceCalendarEvents,
} from "./compliance-data";
import type { TeamMember } from "@/lib/types/compliance";
import type { FeedbackData } from "@/lib/types/process-form";
import { compileProcess } from "@/lib/process-forms";
import { getRegulationContent } from "./regulation-content/index";
import { AML_SECTION_TO_PROCESS } from "./regulation-content/aml-ctf-rules";

// Seed in-memory feedback store from copied JSON files
import cddIndividualsFeedback from "@/data/feedback/cdd-individuals.json";
import riskAssessmentFeedback from "@/data/feedback/risk-assessment.json";

const feedbackStore: Record<string, FeedbackData> = {
  "cdd-individuals": cddIndividualsFeedback as FeedbackData,
  "risk-assessment": riskAssessmentFeedback as FeedbackData,
};

// Per-regulation section→process slug mappings (for feedback lookup)
const SECTION_TO_PROCESS_BY_REGULATION: Record<string, Record<string, string>> = {
  "aml-ctf-rules": AML_SECTION_TO_PROCESS,
};

let teamMembers = [...mockTeamMembers];
let nextTeamId = 6;

export const complianceHandlers = [
  // Regulations
  http.get("/api/compliance/regulations", () => {
    return HttpResponse.json(regulationsCatalog);
  }),

  http.get("/api/compliance/regulations/:id", ({ params }) => {
    const regulation = regulationsCatalog.find((l) => l.id === params.id);
    if (!regulation) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(regulation);
  }),

  // Introduction data for a regulation
  http.get("/api/compliance/regulations/:id/introduction", ({ params }) => {
    const content = getRegulationContent(params.id as string);
    if (!content) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(content.introduction);
  }),

  // Manifest (pdfUrl, mermaidDiagram, hasIntroductionForm, sectionGating)
  http.get("/api/compliance/regulations/:id/manifest", ({ params }) => {
    const content = getRegulationContent(params.id as string);
    if (!content) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(content.manifest);
  }),

  // Section schema (compiled from process forms)
  http.get(
    "/api/compliance/regulations/:id/sections/:sectionId/schema",
    ({ params }) => {
      const regulation = regulationsCatalog.find((l) => l.id === params.id);
      if (!regulation) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      const content = getRegulationContent(params.id as string);
      const form = content?.sectionForms[params.sectionId as string];
      if (!form) {
        return HttpResponse.json({ error: "Section not found" }, { status: 404 });
      }

      const compiled = compileProcess(form);

      // Attach any stored feedback as review metadata
      const sectionToProcess = SECTION_TO_PROCESS_BY_REGULATION[params.id as string] ?? {};
      const slug = sectionToProcess[params.sectionId as string];
      const feedback = slug ? feedbackStore[slug] : undefined;
      if (feedback && compiled._review_metadata === undefined) {
        compiled._review_metadata = {
          form_id: slug,
          notes: feedback.notes,
          control_notes: feedback.control_notes,
          last_updated: feedback.last_updated,
        };
      }

      return HttpResponse.json(compiled);
    },
  ),

  // Feedback — GET
  http.get("/api/compliance/feedback/:formId", ({ params }) => {
    const formId = params.formId as string;
    const data = feedbackStore[formId] ?? { form_id: formId };
    return HttpResponse.json(data);
  }),

  // Feedback — POST (merge-write)
  http.post("/api/compliance/feedback/:formId", async ({ params, request }) => {
    const formId = params.formId as string;
    const incoming = (await request.json()) as Partial<FeedbackData>;
    const existing = feedbackStore[formId] ?? { form_id: formId };

    feedbackStore[formId] = {
      ...existing,
      ...incoming,
      form_id: formId,
      control_notes: {
        ...(existing.control_notes ?? {}),
        ...(incoming.control_notes ?? {}),
      },
      last_updated: new Date().toISOString(),
    };

    return HttpResponse.json(feedbackStore[formId]);
  }),

  // Team
  http.get("/api/compliance/team", () => {
    return HttpResponse.json(teamMembers);
  }),

  http.post("/api/compliance/team", async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; role: string };
    const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-violet-500"];
    const member: TeamMember = {
      id: `tm-${nextTeamId++}`,
      name: body.name,
      email: body.email,
      role: body.role,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };
    teamMembers.push(member);
    return HttpResponse.json(member, { status: 201 });
  }),

  http.put("/api/compliance/team/:id", async ({ params, request }) => {
    const idx = teamMembers.findIndex((m) => m.id === params.id);
    if (idx === -1) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updates = (await request.json()) as Partial<TeamMember>;
    teamMembers[idx] = { ...teamMembers[idx], ...updates, id: teamMembers[idx].id };
    return HttpResponse.json(teamMembers[idx]);
  }),

  http.delete("/api/compliance/team/:id", ({ params }) => {
    const idx = teamMembers.findIndex((m) => m.id === params.id);
    if (idx === -1) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    teamMembers.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  // Calendar
  http.get("/api/compliance/calendar", () => {
    return HttpResponse.json(complianceCalendarEvents);
  }),
];
