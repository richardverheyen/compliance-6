"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useComplianceStore } from "@/lib/compliance-store";

export default function TeamPage() {
  const {
    activeRegulations,
    regulations,
    addTeamMember,
    removeTeamMember,
    updateMemberOrgRole,
    getTeamMembersWithAuth,
    pendingInvitations,
    processAssignments,
  } = useComplianceStore();

  const { membership } = useOrganization();
  const { user } = useUser();

  const teamMembers = getTeamMembersWithAuth();
  const currentUserId = user?.id ?? "";
  const isCurrentUserAdmin = membership?.role === "org:admin";
  const adminCount = teamMembers.filter((m) => m.orgRole === "org:admin").length;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [inviteOrgRole, setInviteOrgRole] = useState<"org:member" | "org:admin">("org:member");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    await addTeamMember({ email, role: role || undefined, orgRole: inviteOrgRole });
    setEmail("");
    setRole("");
    setInviteOrgRole("org:member");
  }

  async function handleRemove(id: string) {
    await removeTeamMember(id);
    setConfirmDelete(null);
  }

  async function handleToggleAdmin(memberId: string, currentOrgRole: "org:admin" | "org:member") {
    const next = currentOrgRole === "org:admin" ? "org:member" : "org:admin";
    setRoleLoading(memberId);
    await updateMemberOrgRole(memberId, next);
    setRoleLoading(null);
  }

  function getOwnedProcesses(memberId: string) {
    const owned: { processTitle: string; regulationName: string }[] = [];
    for (const al of activeRegulations) {
      for (const proc of al.processes) {
        if (proc.ownerId === memberId) {
          owned.push({ processTitle: proc.title, regulationName: al.regulationId });
        }
      }
    }
    for (const [processId, assignedMemberId] of Object.entries(processAssignments)) {
      if (assignedMemberId === memberId) {
        for (const leg of regulations) {
          const proc = leg.processes.find((p) => p.id === processId);
          if (proc) {
            owned.push({ processTitle: proc.name, regulationName: leg.shortName });
            break;
          }
        }
      }
    }
    return owned;
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
        <p className="mt-2 text-gray-600">
          Manage team members responsible for compliance processes.
        </p>

        {/* Invite form — admins only */}
        {isCurrentUserAdmin && (
          <form
            onSubmit={handleInvite}
            className="mt-8 rounded-xl border border-gray-200 bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                  Role / job title <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="invite-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Organisation role</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="invite-org-role"
                    value="org:member"
                    checked={inviteOrgRole === "org:member"}
                    onChange={() => setInviteOrgRole("org:member")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Member
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="invite-org-role"
                    value="org:admin"
                    checked={inviteOrgRole === "org:admin"}
                    onChange={() => setInviteOrgRole("org:admin")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Admin
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Admins can invite and remove team members, change roles, and edit organisation settings.
              </p>
            </div>

            <button
              type="submit"
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Send invitation
            </button>
          </form>
        )}

        {/* Active team members */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <div className="mt-4 space-y-4">
            {teamMembers.length === 0 && (
              <p className="text-sm text-gray-500">No active members yet.</p>
            )}
            {teamMembers.map((member) => {
              const owned = getOwnedProcesses(member.id);
              const isMe = member.id === currentUserId;
              const isAdmin = member.orgRole === "org:admin";
              // Can't demote if they're the last admin
              const canToggleAdmin = isCurrentUserAdmin && !(isAdmin && adminCount <= 1);

              return (
                <div
                  key={member.id}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${member.avatarColor}`}
                  >
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {member.name}
                        {isMe && <span className="ml-1 text-xs font-normal text-gray-400">(you)</span>}
                      </h3>
                      {isAdmin && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          Admin
                        </span>
                      )}
                      {member.role && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {member.role}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>

                    {owned.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Responsible for:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {owned.map((o, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                            >
                              {o.processTitle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Promote / demote — admins only, not for self */}
                    {isCurrentUserAdmin && !isMe && (
                      <button
                        onClick={() => handleToggleAdmin(member.id, member.orgRole)}
                        disabled={roleLoading === member.id || !canToggleAdmin}
                        title={
                          !canToggleAdmin && isAdmin
                            ? "Cannot remove the last admin"
                            : isAdmin
                            ? "Remove admin role"
                            : "Make admin"
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {roleLoading === member.id
                          ? "…"
                          : isAdmin
                          ? "Remove admin"
                          : "Make admin"}
                      </button>
                    )}

                    {/* Remove — admins only */}
                    {isCurrentUserAdmin && (
                      confirmDelete === member.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(member.id)}
                          disabled={isMe && adminCount <= 1}
                          title={isMe && adminCount <= 1 ? "Cannot remove the last admin" : undefined}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
            <div className="mt-4 space-y-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited {new Date(inv.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {isCurrentUserAdmin && (
                    confirmDelete === inv.id ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleRemove(inv.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(inv.id)}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Revoke
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
