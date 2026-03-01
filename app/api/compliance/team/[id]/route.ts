import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId } = await auth();
  const tenantId = orgId ?? userId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await req.json() as { role?: string; avatarColor?: string };

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("team_members")
    .update({
      ...(updates.role !== undefined && { role: updates.role }),
      ...(updates.avatarColor !== undefined && { avatar_color: updates.avatarColor }),
    })
    .eq("id", id)
    .eq("org_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    role: data.role ?? "",
    avatarColor: data.avatar_color ?? "",
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId, orgRole: currentUserOrgRole } = await auth();
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  // Guard: current user must be an admin
  if (currentUserOrgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { orgRole } = await req.json() as { orgRole: "org:admin" | "org:member" };

  if (orgRole !== "org:admin" && orgRole !== "org:member") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const clerk = await clerkClient();

  // Guard: cannot demote the last admin
  if (orgRole === "org:member") {
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    const adminCount = memberships.data.filter((m) => m.role === "org:admin").length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  await clerk.organizations.updateOrganizationMembership({
    organizationId: orgId,
    userId: id,
    role: orgRole,
  });

  return NextResponse.json({ ok: true, orgRole });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  const { id } = await params;
  const clerk = await clerkClient();

  if (id.startsWith("orginv_")) {
    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: id,
      requestingUserId: userId,
    });
  } else {
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: id,
    });
    const supabase = createSupabaseClient();
    await supabase
      .from("team_members")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
  }

  return NextResponse.json({ ok: true });
}
