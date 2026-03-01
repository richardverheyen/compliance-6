import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []).map((row) => ({
    date: row.date_label,
    title: row.title,
    agency: row.agency ?? "",
    description: row.description ?? "",
  }));

  return NextResponse.json(events);
}
