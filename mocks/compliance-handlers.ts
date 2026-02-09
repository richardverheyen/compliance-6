import { http, HttpResponse } from "msw";
import {
  legislationsCatalog,
  mockTeamMembers,
  complianceCalendarEvents,
  getSectionData,
} from "./compliance-data";
import type { TeamMember } from "@/lib/types/compliance";
import { compile } from "@/lib/compliance-forms";

let teamMembers = [...mockTeamMembers];
let nextTeamId = 6;

export const complianceHandlers = [
  // Legislations
  http.get("/api/compliance/legislations", () => {
    return HttpResponse.json(legislationsCatalog);
  }),

  http.get("/api/compliance/legislations/:id", ({ params }) => {
    const legislation = legislationsCatalog.find((l) => l.id === params.id);
    if (!legislation) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(legislation);
  }),

  // Section schema (server-side compilation)
  http.get(
    "/api/compliance/legislations/:id/sections/:sectionId/schema",
    ({ params }) => {
      const legislation = legislationsCatalog.find((l) => l.id === params.id);
      if (!legislation) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      const sectionData = getSectionData(params.sectionId as string);
      if (sectionData.fields.length === 0 && sectionData.groups.length === 0) {
        return HttpResponse.json({ error: "Section not found" }, { status: 404 });
      }

      const { schema, uiSchema } = compile(
        sectionData.fields,
        sectionData.groups,
        sectionData.rules,
      );

      return HttpResponse.json({
        schema,
        uiSchema,
        fields: sectionData.fields,
        groups: sectionData.groups,
        rules: sectionData.rules,
      });
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

  // Calendar
  http.get("/api/compliance/calendar", () => {
    return HttpResponse.json(complianceCalendarEvents);
  }),
];
