"use client";

import { useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";

interface AssignOwnerModalProps {
  processId: string;
  processName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignOwnerModal({ processId, processName, isOpen, onClose }: AssignOwnerModalProps) {
  const {
    getTeamMembersWithAuth,
    getLegislationProcessOwner,
    assignLegislationProcessOwner,
    unassignLegislationProcessOwner,
    addTeamMember,
  } = useComplianceStore();

  const members = getTeamMembersWithAuth();
  const currentOwnerId = getLegislationProcessOwner(processId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  if (!isOpen) return null;

  function handleSelect(memberId: string | null) {
    if (memberId === null) {
      unassignLegislationProcessOwner(processId);
    } else {
      assignLegislationProcessOwner(processId, memberId);
    }
    onClose();
  }

  async function handleAddAndAssign(e: React.FormEvent) {
    e.preventDefault();
    await addTeamMember({ name: newName, email: newEmail, role: newRole });
    // After adding, find the new member and assign
    const updated = useComplianceStore.getState().teamMembers;
    const newMember = updated.find((m) => m.email === newEmail);
    if (newMember) {
      assignLegislationProcessOwner(processId, newMember.id);
    }
    setNewName("");
    setNewEmail("");
    setNewRole("");
    setShowAddForm(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Owner</h2>
            <p className="text-sm text-gray-500">{processName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-3">
          {/* Unassign option */}
          <button
            onClick={() => handleSelect(null)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
              !currentOwnerId ? "bg-gray-50 ring-1 ring-indigo-200" : ""
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
              --
            </div>
            <div>
              <p className="font-medium text-gray-700">Unassigned</p>
              <p className="text-xs text-gray-400">Remove current owner</p>
            </div>
            {!currentOwnerId && (
              <svg className="ml-auto h-4 w-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Team members */}
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => handleSelect(member.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                currentOwnerId === member.id ? "bg-gray-50 ring-1 ring-indigo-200" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${member.avatarColor}`}
              >
                {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="truncate text-xs text-gray-500">{member.role}</p>
              </div>
              {currentOwnerId === member.id && (
                <svg className="ml-auto h-4 w-4 shrink-0 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Add new member */}
        <div className="border-t border-gray-200 p-3">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Member
            </button>
          ) : (
            <form onSubmit={handleAddAndAssign} className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Add New Member</p>
              <input
                type="text"
                required
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Add & Assign
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
