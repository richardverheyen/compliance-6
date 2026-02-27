import { http, HttpResponse } from "msw";
import {
  regulationsCatalog,
  mockTeamMembers,
  complianceCalendarEvents,
  regulationKeyDates,
} from "./compliance-data";
import type { TeamMember } from "@/lib/types/compliance";
import { compileProcess } from "@/lib/process-forms";
import { getRegulationContent } from "./regulation-content/index";

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

  // Manifest (pdfUrl, mermaidDiagram, hasIntroductionForm, processList)
  http.get("/api/compliance/regulations/:id/manifest", ({ params }) => {
    const content = getRegulationContent(params.id as string);
    if (!content) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(content.manifest);
  }),

  // Process schema (compiled from process forms)
  http.get(
    "/api/compliance/regulations/:id/processes/:processId/schema",
    ({ params }) => {
      const regulation = regulationsCatalog.find((l) => l.id === params.id);
      if (!regulation) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      const content = getRegulationContent(params.id as string);
      const processId = params.processId as string;
      const form = content?.processForms[processId];
      if (!form) {
        return HttpResponse.json({ error: "Process not found" }, { status: 404 });
      }

      return HttpResponse.json(compileProcess(form));
    },
  ),

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

  // Key dates per regulation
  http.get("/api/compliance/regulations/:id/key-dates", ({ params }) => {
    const dates = regulationKeyDates[params.id as string];
    if (!dates) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(dates);
  }),

  // Calendar
  http.get("/api/compliance/calendar", () => {
    return HttpResponse.json(complianceCalendarEvents);
  }),
];
