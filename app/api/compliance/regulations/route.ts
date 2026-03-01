import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("regulations")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map snake_case DB columns to camelCase for the client
  const regulations = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    agency: row.agency,
    jurisdiction: row.jurisdiction,
    description: row.description,
    applicableServices: row.applicable_services ?? [],
    processes: row.processes ?? [],
  }));

  return NextResponse.json(regulations);
}
