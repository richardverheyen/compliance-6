import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
];

export async function GET() {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("org_id", tenantId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? "",
    avatarColor: row.avatar_color ?? AVATAR_COLORS[0],
  }));

  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json() as { name: string; email: string; role: string };
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      org_id: tenantId,
      name: body.name,
      email: body.email,
      role: body.role,
      avatar_color: avatarColor,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json(
    { id: data.id, name: data.name, email: data.email, role: data.role ?? "", avatarColor: data.avatar_color ?? avatarColor },
    { status: 201 },
  );
}
