"use client";

import type { BusinessProcess } from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";

const ratingColors = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
};

const ratingLabels = {
  red: "Non-compliant",
  yellow: "Partially compliant",
  green: "Compliant",
};

interface ProcessCardProps {
  process: BusinessProcess;
  expanded: boolean;
  onToggle: () => void;
}

export function ProcessCard({ process, expanded, onToggle }: ProcessCardProps) {
  const rating = getProcessRating(process);
  const compliantCount = process.steps.filter(
    (s) => s.rating === "green",
  ).length;

  return (
    <div className="rounded-xl border border-gray-200 transition-shadow hover:shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${ratingColors[rating]}`}
          title={ratingLabels[rating]}
        />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{process.title}</h3>
          <p className="text-sm text-gray-500">
            {compliantCount} of {process.steps.length} steps compliant
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          <ul className="space-y-2">
            {process.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${ratingColors[step.rating]}`}
                  title={ratingLabels[step.rating]}
                />
                <span className="text-sm text-gray-700">{step.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
