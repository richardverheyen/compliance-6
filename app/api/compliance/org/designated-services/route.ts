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
  const { data } = await supabase
    .from("organisations")
    .select("designated_services")
    .eq("id", tenantId)
    .single();

  return NextResponse.json(data?.designated_services ?? {});
}

// Body: Record<string, boolean> — true = selected ("Yes"), false = deselected (remove)
export async function PATCH(req: Request) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json() as Record<string, boolean>;
  const supabase = createSupabaseClient();

  const { data: existing } = await supabase
    .from("organisations")
    .select("designated_services")
    .eq("id", tenantId)
    .single();

  const current = (existing?.designated_services ?? {}) as Record<string, string>;
  const updated = { ...current };
  for (const [key, val] of Object.entries(body)) {
    if (val) {
      updated[key] = "Yes";
    } else {
      delete updated[key];
    }
  }

  await supabase
    .from("organisations")
    .upsert({ id: tenantId, designated_services: updated }, { onConflict: "id" });

  return NextResponse.json(updated);
}
