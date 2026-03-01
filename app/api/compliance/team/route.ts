import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ members: [], pending: [] });
  }

  const clerk = await clerkClient();

  const [memberships, invitations] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
    clerk.organizations.getPendingOrganizationInvitationList({ organizationId: orgId, limit: 100 }),
  ]);

  const supabase = createSupabaseClient();
  const { data: dbRows } = await supabase
    .from("team_members")
    .select("id, role, avatar_color")
    .eq("org_id", orgId);

  const dbMap = new Map((dbRows ?? []).map((r) => [r.id, r]));

  // Lazy upsert: create team_members record for any Clerk member not yet in DB
  const memberUserIds = memberships.data
    .map((m) => m.publicUserData?.userId)
    .filter((id): id is string => Boolean(id));
  const missingIds = memberUserIds.filter((id) => !dbMap.has(id));
  if (missingIds.length > 0) {
    const inserts = missingIds.map((id) => ({
      id,
      org_id: orgId,
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    }));
    const { data: newRows } = await supabase
      .from("team_members")
      .upsert(inserts, { onConflict: "id" })
      .select("id, role, avatar_color");
    (newRows ?? []).forEach((r) => dbMap.set(r.id, r));
  }

  const members = memberships.data.map((m) => {
    const uid = m.publicUserData?.userId ?? "";
    const dbRow = dbMap.get(uid);
    const firstName = m.publicUserData?.firstName ?? "";
    const lastName = m.publicUserData?.lastName ?? "";
    return {
      id: uid,
      name: [firstName, lastName].filter(Boolean).join(" ") || m.publicUserData?.identifier ?? uid,
      email: m.publicUserData?.identifier ?? "",
      role: dbRow?.role ?? "",
      avatarColor: dbRow?.avatar_color ?? AVATAR_COLORS[0],
    };
  });

  const pending = invitations.data.map((inv) => ({
    id: inv.id,
    email: inv.emailAddress,
    createdAt: new Date(inv.createdAt).toISOString(),
  }));

  return NextResponse.json({ members, pending });
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  const body = await req.json() as { email: string; role?: string };

  const clerk = await clerkClient();
  const invitation = await clerk.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: body.email,
    inviterUserId: userId,
    role: "org:member",
  });

  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.emailAddress,
      createdAt: new Date(invitation.createdAt).toISOString(),
    },
    { status: 201 },
  );
}
