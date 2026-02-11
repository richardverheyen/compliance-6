"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";

export default function TeamPage() {
  const {
    activeLegislations,
    legislations,
    fetchTeam,
    addTeamMember,
    removeTeamMember,
    getTeamMembersWithAuth,
    processAssignments,
  } = useComplianceStore();

  const teamMembers = getTeamMembersWithAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (teamMembers.length === 0) {
      fetchTeam();
    }
  }, [teamMembers.length, fetchTeam]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await addTeamMember({ name, email, role });
    setName("");
    setEmail("");
    setRole("");
  }

  async function handleRemove(id: string) {
    await removeTeamMember(id);
    setConfirmDelete(null);
  }

  // Build a map of memberId -> processes they own
  function getOwnedProcesses(memberId: string) {
    const owned: { processTitle: string; legislationName: string }[] = [];
    // Check BusinessProcess assignments (section-based)
    for (const al of activeLegislations) {
      for (const proc of al.processes) {
        if (proc.ownerId === memberId) {
          owned.push({
            processTitle: proc.title,
            legislationName: al.legislationId,
          });
        }
      }
    }
    // Check LegislationProcess assignments
    for (const [processId, assignedMemberId] of Object.entries(processAssignments)) {
      if (assignedMemberId === memberId) {
        // Look up process name from legislations catalog
        for (const leg of legislations) {
          const proc = leg.processes.find((p) => p.id === processId);
          if (proc) {
            owned.push({
              processTitle: proc.name,
              legislationName: leg.shortName,
            });
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

        {/* Add member form */}
        <form
          onSubmit={handleAdd}
          className="mt-8 rounded-xl border border-gray-200 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add Member
          </button>
        </form>

        {/* Team list */}
        <div className="mt-8 space-y-4">
          {teamMembers.map((member) => {
            const owned = getOwnedProcesses(member.id);
            return (
              <div
                key={member.id}
                className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5"
              >
                {/* Avatar */}
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {member.role}
                    </span>
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

                {/* Remove */}
                {confirmDelete === member.id ? (
                  <div className="flex shrink-0 items-center gap-2">
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
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
