import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = createSupabaseClient();

  const { data: arRows, error: arError } = await supabase
    .from("active_regulations")
    .select("*")
    .eq("org_id", tenantId);

  if (arError) {
    return NextResponse.json({ error: arError.message }, { status: 500 });
  }

  const { data: saRows, error: saError } = await supabase
    .from("self_assessments")
    .select("*")
    .eq("org_id", tenantId);

  if (saError) {
    return NextResponse.json({ error: saError.message }, { status: 500 });
  }

  const activeRegulations = (arRows ?? []).map((ar) => {
    const assessments = (saRows ?? [])
      .filter((sa) => sa.regulation_id === ar.regulation_id)
      .map((sa) => ({
        id: sa.id,
        regulationId: sa.regulation_id,
        status: sa.status,
        startedAt: sa.started_at,
        completedAt: sa.completed_at ?? undefined,
        completedBy: sa.completed_by ?? undefined,
        sectionAnswers: sa.section_answers ?? {},
      }));

    const activeAssessment = assessments.find((s) => s.status === "in_progress");

    return {
      regulationId: ar.regulation_id,
      activatedAt: ar.activated_at,
      selfAssessments: assessments,
      activeAssessmentId: activeAssessment?.id ?? null,
      // processes computed client-side from sectionAnswers
      processes: [],
    };
  });

  return NextResponse.json(activeRegulations);
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json() as {
    regulationId: string;
    introAnswers: Record<string, string>;
  };

  const supabase = createSupabaseClient();

  // Insert active_regulation (upsert to handle re-activation)
  const { data: ar, error: arError } = await supabase
    .from("active_regulations")
    .upsert(
      {
        org_id: tenantId,
        regulation_id: body.regulationId,
      },
      { onConflict: "org_id,regulation_id" },
    )
    .select()
    .single();

  if (arError || !ar) {
    return NextResponse.json({ error: arError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Create the first self_assessment
  const { data: sa, error: saError } = await supabase
    .from("self_assessments")
    .insert({
      org_id: tenantId,
      regulation_id: body.regulationId,
      status: "in_progress",
      section_answers: { "risk-assessment": body.introAnswers },
    })
    .select()
    .single();

  if (saError || !sa) {
    return NextResponse.json({ error: saError?.message ?? "Assessment insert failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      regulationId: ar.regulation_id,
      activatedAt: ar.activated_at,
      selfAssessments: [
        {
          id: sa.id,
          regulationId: sa.regulation_id,
          status: sa.status,
          startedAt: sa.started_at,
          sectionAnswers: sa.section_answers,
        },
      ],
      activeAssessmentId: sa.id,
      processes: [],
    },
    { status: 201 },
  );
}
