import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await req.json() as { name?: string; email?: string; role?: string };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .update({ name: updates.name, email: updates.email, role: updates.role })
    .eq("id", id)
    .eq("org_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role ?? "",
    avatarColor: data.avatar_color ?? "",
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("org_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
