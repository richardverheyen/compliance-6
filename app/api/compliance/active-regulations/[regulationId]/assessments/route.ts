import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ regulationId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { regulationId } = await params;
  const body = await req.json() as { introAnswers: Record<string, string> };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("self_assessments")
    .insert({
      org_id: tenantId,
      regulation_id: regulationId,
      status: "in_progress",
      section_answers: { "risk-assessment": body.introAnswers },
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: data.id,
      regulationId: data.regulation_id,
      status: data.status,
      startedAt: data.started_at,
      sectionAnswers: data.section_answers,
    },
    { status: 201 },
  );
}
