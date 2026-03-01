import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("regulation_key_dates")
    .select("*")
    .eq("regulation_id", id)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const keyDates = data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    isoDate: row.iso_date,
    recurrence: row.recurrence,
    isCountdownPrimary: row.is_countdown_primary,
  }));

  return NextResponse.json(keyDates);
}
