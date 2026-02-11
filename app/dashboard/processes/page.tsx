"use client";

import { useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { LegislationProcess } from "@/lib/types/compliance";
import Link from "next/link";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";

interface ProcessGroup {
  legislationId: string;
  legislationName: string;
  processes: LegislationProcess[];
}

export default function ProcessesPage() {
  const { activeLegislations, legislations, getLegislationProcessOwner, getTeamMembersWithAuth } = useComplianceStore();
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ processId: string; processName: string } | null>(null);

  function getLegislationName(id: string) {
    return legislations.find((l) => l.id === id)?.shortName ?? id;
  }

  // Group processes by legislation
  const groups: ProcessGroup[] = [];
  for (const al of activeLegislations) {
    const leg = legislations.find((l) => l.id === al.legislationId);
    if (leg?.processes && leg.processes.length > 0) {
      groups.push({
        legislationId: al.legislationId,
        legislationName: getLegislationName(al.legislationId),
        processes: leg.processes,
      });
    }
  }

  const hasProcesses = groups.some((g) => g.processes.length > 0);

  if (!hasProcesses) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
          <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No active processes</h2>
            <p className="mt-2 text-sm text-gray-600">
              Activate a legislation to see your business processes here.
            </p>
            <Link
              href="/dashboard/legislations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Browse Legislations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
        <p className="mt-2 text-gray-600">
          View and manage compliance processes across your active legislations.
        </p>

        {groups.map((group) => (
          <div key={group.legislationId} className="mt-8">
            {groups.length > 1 && (
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {group.legislationName}
              </h2>
            )}

            <div className="space-y-4">
              {group.processes.map((proc) => {
                const expanded = expandedProcess === proc.id;
                const ownerId = getLegislationProcessOwner(proc.id);
                const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;

                return (
                  <div key={proc.id} className="rounded-xl border border-gray-200 bg-white">
                    <div
                      className="flex cursor-pointer items-center gap-4 p-5"
                      onClick={() => setExpandedProcess(expanded ? null : proc.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">{proc.name}</h3>
                        <p className="text-xs text-gray-500">
                          {owner ? (
                            <>{owner.name} &middot; {owner.role}</>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAssignModal({ processId: proc.id, processName: proc.name }); }}
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              Unassigned
                            </button>
                          )}
                        </p>
                      </div>
                      <div className="hidden items-center gap-4 sm:flex">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {proc.frequencyLabel}
                        </span>
                      </div>
                      <svg
                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Description</p>
                          <p className="mt-1 text-sm text-gray-700">{proc.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Business Objective</p>
                          <p className="mt-1 text-sm text-gray-700">{proc.businessObjective}</p>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</p>
                            <p className="mt-1 text-sm text-gray-700 capitalize">{proc.frequency} &middot; per {proc.frequencyPer}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Owner</p>
                            <p className="mt-1 text-sm text-gray-700">
                              {owner ? (
                                <>{owner.name} &middot; {owner.role}</>
                              ) : (
                                <button
                                  onClick={() => setAssignModal({ processId: proc.id, processName: proc.name })}
                                  className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                  Unassigned &mdash; click to assign
                                </button>
                              )}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Frequency Detail</p>
                          <p className="mt-1 text-sm text-gray-700">{proc.frequencyDetail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {assignModal && (
          <AssignOwnerModal
            processId={assignModal.processId}
            processName={assignModal.processName}
            isOpen
            onClose={() => setAssignModal(null)}
          />
        )}
      </div>
    </div>
  );
}
