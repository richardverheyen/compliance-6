import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("regulations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    shortName: data.short_name,
    agency: data.agency,
    jurisdiction: data.jurisdiction,
    description: data.description,
    applicableServices: data.applicable_services ?? [],
    processes: data.processes ?? [],
  });
}
