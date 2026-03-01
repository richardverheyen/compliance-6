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
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("org_id", tenantId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminders = (data ?? []).map((row) => ({
    id: row.id,
    keyDateId: row.key_date_id,
    regulationId: row.regulation_id,
    channel: row.channel,
    timing: row.timing,
    customDate: row.custom_date ?? undefined,
  }));

  return NextResponse.json(reminders);
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json() as {
    keyDateId: string;
    regulationId: string;
    channel: string;
    timing: string;
    customDate?: string;
  };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      org_id: tenantId,
      key_date_id: body.keyDateId,
      regulation_id: body.regulationId,
      channel: body.channel,
      timing: body.timing,
      custom_date: body.customDate ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: data.id,
      keyDateId: data.key_date_id,
      regulationId: data.regulation_id,
      channel: data.channel,
      timing: data.timing,
      customDate: data.custom_date ?? undefined,
    },
    { status: 201 },
  );
}
