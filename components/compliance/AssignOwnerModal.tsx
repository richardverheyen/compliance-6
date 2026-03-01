"use client";

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
    getRegulationProcessOwner,
    assignRegulationProcessOwner,
    unassignRegulationProcessOwner,
  } = useComplianceStore();

  const members = getTeamMembersWithAuth();
  const currentOwnerId = getRegulationProcessOwner(processId);

  if (!isOpen) return null;

  function handleSelect(memberId: string | null) {
    if (memberId === null) {
      unassignRegulationProcessOwner(processId);
    } else {
      assignRegulationProcessOwner(processId, memberId);
    }
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
          {members.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">
              No team members yet. Invite members from the{" "}
              <a href="/dashboard/team" className="text-indigo-600 hover:underline">
                Team page
              </a>
              .
            </p>
          )}
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
      </div>
    </div>
  );
}
