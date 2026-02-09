import { http, HttpResponse } from "msw";
import {
  legislationsCatalog,
  generateMockRatings,
  mockTeamMembers,
  complianceCalendarEvents,
} from "./compliance-data";
import type { BusinessProfile, ActiveLegislation, TeamMember } from "@/lib/types/compliance";

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

  http.post("/api/compliance/legislations/:id/activate", async ({ params, request }) => {
    const legislation = legislationsCatalog.find((l) => l.id === params.id);
    if (!legislation) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profile = (await request.json()) as BusinessProfile;
    const active: ActiveLegislation = {
      legislationId: legislation.id,
      activatedAt: new Date().toISOString(),
      businessProfile: profile,
      processes: generateMockRatings(legislation),
    };

    return HttpResponse.json(active);
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
