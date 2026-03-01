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
    .select("*")
    .eq("id", tenantId)
    .single();

  if (!data) {
    return NextResponse.json({ location: null, applicableServices: [] });
  }

  return NextResponse.json({
    location: data.location ?? null,
    applicableServices: data.applicable_services ?? [],
  });
}

export async function PUT(req: Request) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json() as {
    location?: string | null;
    applicableServices?: string[];
  };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("organisations")
    .upsert(
      {
        id: tenantId,
        location: body.location ?? null,
        applicable_services: body.applicableServices ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Upsert failed" }, { status: 500 });
  }

  return NextResponse.json({
    location: data.location ?? null,
    applicableServices: data.applicable_services ?? [],
  });
}
