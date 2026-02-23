"use client";

import { useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { RegulationProcess } from "@/lib/types/compliance";
import Link from "next/link";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";

interface ProcessGroup {
  regulationId: string;
  regulationName: string;
  processes: RegulationProcess[];
}

export default function ProcessesPage() {
  const { activeRegulations, regulations, getRegulationProcessOwner, getTeamMembersWithAuth } = useComplianceStore();
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ processId: string; processName: string } | null>(null);

  function getRegulationName(id: string) {
    return regulations.find((l) => l.id === id)?.shortName ?? id;
  }

  // Group processes by regulation
  const groups: ProcessGroup[] = [];
  for (const al of activeRegulations) {
    const leg = regulations.find((l) => l.id === al.regulationId);
    if (leg?.processes && leg.processes.length > 0) {
      groups.push({
        regulationId: al.regulationId,
        regulationName: getRegulationName(al.regulationId),
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
              Activate a regulation to see your business processes here.
            </p>
            <Link
              href="/dashboard/regulations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Browse Regulations
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
          View and manage compliance processes across your active regulations.
        </p>

        {groups.map((group) => {
          const topLevel = group.processes.filter((p) => !p.parentId);
          const childrenOf = (parentId: string) => group.processes.filter((p) => p.parentId === parentId);

          return (
            <div key={group.regulationId} className="mt-8">
              {groups.length > 1 && (
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  {group.regulationName}
                </h2>
              )}

              <div className="space-y-4">
                {topLevel.map((proc) => {
                  const children = childrenOf(proc.id);

                  return (
                    <ProcessCard
                      key={proc.id}
                      process={proc}
                      children={children}
                      expandedProcess={expandedProcess}
                      onToggle={(id) => setExpandedProcess(expandedProcess === id ? null : id)}
                      onAssign={(id, name) => setAssignModal({ processId: id, processName: name })}
                      getRegulationProcessOwner={getRegulationProcessOwner}
                      getTeamMembersWithAuth={getTeamMembersWithAuth}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

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

function ProcessCard({
  process,
  children,
  expandedProcess,
  onToggle,
  onAssign,
  getRegulationProcessOwner,
  getTeamMembersWithAuth,
}: {
  process: RegulationProcess;
  children: RegulationProcess[];
  expandedProcess: string | null;
  onToggle: (id: string) => void;
  onAssign: (id: string, name: string) => void;
  getRegulationProcessOwner: (id: string) => string | undefined;
  getTeamMembersWithAuth: () => { id: string; name: string; role: string }[];
}) {
  const expanded = expandedProcess === process.id;
  const ownerId = getRegulationProcessOwner(process.id);
  const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;
  const hasChildren = children.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div
        className="flex cursor-pointer items-center gap-4 p-5"
        onClick={() => onToggle(process.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{process.name}</h3>
            {hasChildren && !expanded && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {children.length} sub-process{children.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {owner ? (
              <>{owner.name} &middot; {owner.role}</>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(process.id, process.name); }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Unassigned
              </button>
            )}
          </p>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {process.frequencyLabel}
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
            <p className="mt-1 text-sm text-gray-700">{process.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Business Objective</p>
            <p className="mt-1 text-sm text-gray-700">{process.businessObjective}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</p>
              <p className="mt-1 text-sm text-gray-700 capitalize">{process.frequency} &middot; per {process.frequencyPer}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Owner</p>
              <p className="mt-1 text-sm text-gray-700">
                {owner ? (
                  <>{owner.name} &middot; {owner.role}</>
                ) : (
                  <button
                    onClick={() => onAssign(process.id, process.name)}
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
            <p className="mt-1 text-sm text-gray-700">{process.frequencyDetail}</p>
          </div>

          {hasChildren && (
            <div className="mt-2 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">Sub-Processes</p>
              <div className="space-y-3 pl-4 border-l-2 border-indigo-100">
                {children.map((child) => (
                  <SubProcessCard
                    key={child.id}
                    process={child}
                    expanded={expandedProcess === child.id}
                    onToggle={() => onToggle(child.id)}
                    onAssign={() => onAssign(child.id, child.name)}
                    getRegulationProcessOwner={getRegulationProcessOwner}
                    getTeamMembersWithAuth={getTeamMembersWithAuth}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubProcessCard({
  process,
  expanded,
  onToggle,
  onAssign,
  getRegulationProcessOwner,
  getTeamMembersWithAuth,
}: {
  process: RegulationProcess;
  expanded: boolean;
  onToggle: () => void;
  onAssign: () => void;
  getRegulationProcessOwner: (id: string) => string | undefined;
  getTeamMembersWithAuth: () => { id: string; name: string; role: string }[];
}) {
  const ownerId = getRegulationProcessOwner(process.id);
  const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;

  return (
    <div className="rounded-lg border border-gray-150 bg-white">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-800">{process.name}</h4>
          <p className="text-xs text-gray-500">
            {owner ? (
              <>{owner.name}</>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Unassigned
              </button>
            )}
          </p>
        </div>
        <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 sm:inline-block">
          {process.frequencyLabel}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Description</p>
            <p className="mt-1 text-sm text-gray-700">{process.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Business Objective</p>
            <p className="mt-1 text-sm text-gray-700">{process.businessObjective}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</p>
              <p className="mt-1 text-sm text-gray-700 capitalize">{process.frequency} &middot; per {process.frequencyPer}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Owner</p>
              <p className="mt-1 text-sm text-gray-700">
                {owner ? (
                  <>{owner.name} &middot; {owner.role}</>
                ) : (
                  <button
                    onClick={onAssign}
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
            <p className="mt-1 text-sm text-gray-700">{process.frequencyDetail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
