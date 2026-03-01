import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ regulationId: string; assessmentId: string; sectionId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { assessmentId, sectionId } = await params;
  const answers = await req.json() as Record<string, string>;

  const supabase = createSupabaseClient();

  // Fetch current section_answers then merge the new sectionId key
  const { data: existing, error: fetchError } = await supabase
    .from("self_assessments")
    .select("section_answers")
    .eq("id", assessmentId)
    .eq("org_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Not found" }, { status: 404 });
  }

  const merged = {
    ...(existing.section_answers as Record<string, unknown> ?? {}),
    [sectionId]: answers,
  };

  const { error: updateError } = await supabase
    .from("self_assessments")
    .update({ section_answers: merged })
    .eq("id", assessmentId)
    .eq("org_id", tenantId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
