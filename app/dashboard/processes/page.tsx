"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import { getProcessRating } from "@/lib/types/compliance";
import type { BusinessProcess } from "@/lib/types/compliance";
import Link from "next/link";

const ratingConfig = {
  red: { dot: "bg-red-500", label: "Action Required", text: "text-red-700", bg: "bg-red-50" },
  yellow: { dot: "bg-yellow-500", label: "Review Needed", text: "text-yellow-700", bg: "bg-yellow-50" },
  green: { dot: "bg-green-500", label: "Valid", text: "text-green-700", bg: "bg-green-50" },
};

export default function ProcessesPage() {
  const {
    activeLegislations,
    legislations,
    teamMembers,
    fetchTeam,
    getTeamMember,
    assignProcessOwner,
  } = useComplianceStore();

  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);

  useEffect(() => {
    if (teamMembers.length === 0) {
      fetchTeam();
    }
  }, [teamMembers.length, fetchTeam]);

  function getLegislationName(id: string) {
    return legislations.find((l) => l.id === id)?.shortName ?? id;
  }

  // Flatten all processes with their parent legislation info
  const allProcesses: { process: BusinessProcess; legislationId: string; legislationName: string }[] = [];
  for (const al of activeLegislations) {
    for (const proc of al.processes) {
      allProcesses.push({
        process: proc,
        legislationId: al.legislationId,
        legislationName: getLegislationName(al.legislationId),
      });
    }
  }

  if (allProcesses.length === 0) {
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

        <div className="mt-8 space-y-4">
          {allProcesses.map(({ process, legislationId, legislationName }) => {
            const rating = getProcessRating(process);
            const config = ratingConfig[rating];
            const owner = process.ownerId ? getTeamMember(process.ownerId) : undefined;
            const expanded = expandedProcess === process.id;
            const compliantCount = process.steps.filter((s) => s.rating === "green").length;

            return (
              <div key={process.id} className="rounded-xl border border-gray-200 bg-white">
                <div
                  className="flex cursor-pointer items-center gap-4 p-5"
                  onClick={() => setExpandedProcess(expanded ? null : process.id)}
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full ${config.dot}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{process.title}</h3>
                    <p className="text-xs text-gray-500">
                      {legislationName} &middot; {compliantCount} of {process.steps.length} steps compliant
                    </p>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.text} ${config.bg}`}>
                      {config.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {owner?.name ?? "Unassigned"}
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
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                    {/* Owner assignment */}
                    <div className="mb-4 flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">
                        Responsible Person:
                      </label>
                      <select
                        value={process.ownerId ?? ""}
                        onChange={(e) =>
                          assignProcessOwner(legislationId, process.id, e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Step breakdown */}
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                      Step Breakdown
                    </p>
                    <div className="space-y-1.5">
                      {process.steps.map((step) => {
                        const pass = step.rating === "green";
                        return (
                          <div
                            key={step.id}
                            className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                          >
                            <span className="text-sm text-gray-700">{step.title}</span>
                            <span
                              className={`text-xs font-semibold ${
                                pass ? "text-green-600" : step.rating === "yellow" ? "text-yellow-600" : "text-red-600"
                              }`}
                            >
                              {pass ? "\u2713 PASS" : step.rating === "yellow" ? "\u25CB REVIEW" : "\u2717 FAIL"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
