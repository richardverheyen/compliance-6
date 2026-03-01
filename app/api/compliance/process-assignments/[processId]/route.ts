import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { processId } = await params;
  const body = await req.json() as { teamMemberId: string };

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("process_assignments")
    .upsert(
      {
        org_id: tenantId,
        process_id: processId,
        team_member_id: body.teamMemberId,
      },
      { onConflict: "org_id,process_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { processId } = await params;
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("process_assignments")
    .delete()
    .eq("org_id", tenantId)
    .eq("process_id", processId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
