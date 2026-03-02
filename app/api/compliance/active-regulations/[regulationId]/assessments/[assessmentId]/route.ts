import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ regulationId: string; assessmentId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { assessmentId } = await params;

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("self_assessments")
    .delete()
    .eq("id", assessmentId)
    .eq("org_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ regulationId: string; assessmentId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { assessmentId } = await params;
  const body = await req.json() as {
    status?: string;
    completedAt?: string;
    completedBy?: string;
  };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("self_assessments")
    .update({
      status: body.status,
      completed_at: body.completedAt,
      completed_by: body.completedBy,
    })
    .eq("id", assessmentId)
    .eq("org_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    regulationId: data.regulation_id,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at ?? undefined,
    completedBy: data.completed_by ?? undefined,
    sectionAnswers: data.section_answers,
  });
}
