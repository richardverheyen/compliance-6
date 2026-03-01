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
    .from("process_assignments")
    .select("process_id, team_member_id")
    .eq("org_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return Record<processId, teamMemberId>
  const assignments: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.team_member_id) {
      assignments[row.process_id] = row.team_member_id;
    }
  }

  return NextResponse.json(assignments);
}
