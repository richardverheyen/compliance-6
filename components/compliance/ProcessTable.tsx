"use client";

import { useState } from "react";
import Link from "next/link";
import type { BusinessProcess } from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";
import { useComplianceStore } from "@/lib/compliance-store";

const ratingConfig = {
  red: { dot: "bg-red-500", label: "Action Required", text: "text-red-700" },
  yellow: { dot: "bg-yellow-500", label: "Review Needed", text: "text-yellow-700" },
  green: { dot: "bg-green-500", label: "Valid", text: "text-green-700" },
};

interface ProcessTableProps {
  processes: BusinessProcess[];
  legislationId?: string;
}

export function ProcessTable({ processes, legislationId }: ProcessTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { getTeamMember } = useComplianceStore();

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="w-10 px-4 py-3" />
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">Progress</th>
            <th className="hidden px-4 py-3 md:table-cell">Owner</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((proc) => {
            const rating = getProcessRating(proc);
            const config = ratingConfig[rating];
            const expanded = expandedRows.has(proc.id);
            const owner = proc.ownerId ? getTeamMember(proc.ownerId) : undefined;
            const greenCount = proc.steps.filter((s) => s.rating === "green").length;

            return (
              <ProcessRow
                key={proc.id}
                process={proc}
                config={config}
                expanded={expanded}
                ownerName={owner?.name ?? "Unassigned"}
                greenCount={greenCount}
                legislationId={legislationId}
                onToggle={() => toggleRow(proc.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProcessRow({
  process,
  config,
  expanded,
  ownerName,
  greenCount,
  legislationId,
  onToggle,
}: {
  process: BusinessProcess;
  config: { dot: string; label: string; text: string };
  expanded: boolean;
  ownerName: string;
  greenCount: number;
  legislationId?: string;
  onToggle: () => void;
}) {
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
          {process.title}
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
            <span className={`text-xs font-medium ${config.text}`}>
              {config.label}
            </span>
          </span>
        </td>
        <td className="hidden px-4 py-3 text-sm text-gray-500 md:table-cell">
          {greenCount}/{process.steps.length}
        </td>
        <td className="hidden px-4 py-3 text-sm text-gray-500 md:table-cell">
          {ownerName}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-gray-50 px-4 pb-4 pt-2">
            {legislationId && (
              <div className="mb-3">
                <Link
                  href={`/dashboard/legislations/${legislationId}/sections/${process.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open Section Questionnaire &rarr;
                </Link>
              </div>
            )}
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Rule-Level Breakdown
            </p>
            <div className="space-y-1.5">
              {process.steps.map((step) => {
                const pass = step.rating === "green";
                return (
                  <div
                    key={step.id}
                    className="flex items-center justify-between rounded-md bg-white px-3 py-2"
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
          </td>
        </tr>
      )}
    </>
  );
}
