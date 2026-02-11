"use client";

import { useState } from "react";
import type { LegislationProcess } from "@/lib/types/compliance";
import { useComplianceStore } from "@/lib/compliance-store";
import { AssignOwnerModal } from "./AssignOwnerModal";

interface ProcessTableProps {
  processes: LegislationProcess[];
}

export function ProcessTable({ processes }: ProcessTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [assignModal, setAssignModal] = useState<{ processId: string; processName: string } | null>(null);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Process Name</th>
              <th className="hidden px-4 py-3 md:table-cell">Owner</th>
              <th className="hidden px-4 py-3 md:table-cell">Frequency</th>
              <th className="px-4 py-3">Scope</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc) => {
              const expanded = expandedRows.has(proc.id);

              return (
                <ProcessRow
                  key={proc.id}
                  process={proc}
                  expanded={expanded}
                  onToggle={() => toggleRow(proc.id)}
                  onAssign={() => setAssignModal({ processId: proc.id, processName: proc.name })}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {assignModal && (
        <AssignOwnerModal
          processId={assignModal.processId}
          processName={assignModal.processName}
          isOpen
          onClose={() => setAssignModal(null)}
        />
      )}
    </>
  );
}

function ProcessRow({
  process,
  expanded,
  onToggle,
  onAssign,
}: {
  process: LegislationProcess;
  expanded: boolean;
  onToggle: () => void;
  onAssign: () => void;
}) {
  const { getLegislationProcessOwner, getTeamMembersWithAuth } = useComplianceStore();
  const ownerId = getLegislationProcessOwner(process.id);
  const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
      >
        <td className="px-4 py-3">
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {process.name}
        </td>
        <td className="hidden px-4 py-3 text-sm md:table-cell">
          {owner ? (
            <span className="text-gray-700">{owner.name}</span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(); }}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Unassigned
            </button>
          )}
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 capitalize">
            {process.frequency}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {process.frequencyLabel}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-gray-50 px-4 pb-4 pt-2">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-700">{process.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Business Objective</p>
                <p className="mt-1 text-sm text-gray-700">{process.businessObjective}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
