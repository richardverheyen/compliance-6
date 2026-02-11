"use client";

import { useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { LegislationProcess } from "@/lib/types/compliance";
import Link from "next/link";

const statusConfig: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  active: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Active" },
  inactive: { dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50", label: "Inactive" },
};

interface ProcessGroup {
  legislationId: string;
  legislationName: string;
  processes: LegislationProcess[];
}

export default function ProcessesPage() {
  const { activeLegislations, legislations } = useComplianceStore();
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);

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
                const config = statusConfig[proc.status] ?? statusConfig.active;
                const expanded = expandedProcess === proc.id;

                return (
                  <div key={proc.id} className="rounded-xl border border-gray-200 bg-white">
                    <div
                      className="flex cursor-pointer items-center gap-4 p-5"
                      onClick={() => setExpandedProcess(expanded ? null : proc.id)}
                    >
                      <span className={`h-3 w-3 shrink-0 rounded-full ${config.dot}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">{proc.name}</h3>
                        <p className="text-xs text-gray-500">
                          {proc.owner.name} &middot; {proc.owner.role}
                        </p>
                      </div>
                      <div className="hidden items-center gap-4 sm:flex">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.text} ${config.bg}`}>
                          {config.label}
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
                              {proc.owner.name} &middot; {proc.owner.role} &middot; {proc.owner.department}
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
      </div>
    </div>
  );
}
