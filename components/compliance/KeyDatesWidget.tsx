"use client";

import { useEffect, useState } from "react";
import type { RegulationKeyDate } from "@/lib/types/compliance";

/** Annual dates roll to next year once they've passed. */
function nextOccurrence(isoDate: string, recurrence: "annual" | "once"): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  if (recurrence === "annual" && d < today) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtShort(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ResolvedDate extends RegulationKeyDate {
  resolvedDate: string;
  days: number;
}

export function KeyDatesWidget({ regulationId }: { regulationId: string }) {
  const [dates, setDates] = useState<ResolvedDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/compliance/regulations/${regulationId}/key-dates`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RegulationKeyDate[]) => {
        const resolved: ResolvedDate[] = data
          .map((d) => {
            const resolvedDate = nextOccurrence(d.isoDate, d.recurrence);
            return { ...d, resolvedDate, days: daysUntil(resolvedDate) };
          })
          .sort((a, b) => a.days - b.days);
        setDates(resolved);
        setLoading(false);
      });
  }, [regulationId]);

  if (loading || dates.length === 0) return null;

  const primary = dates.find((d) => d.isCountdownPrimary) ?? dates[0];
  const rest = dates.filter((d) => d.id !== primary.id);

  const isOverdue = primary.days < 0;
  const isUrgent = !isOverdue && primary.days <= 30;

  const cardBorder = isOverdue
    ? "border-red-200 from-red-50"
    : isUrgent
      ? "border-amber-200 from-amber-50"
      : "border-indigo-100 from-indigo-50";
  const numColor = isOverdue ? "text-red-700" : isUrgent ? "text-amber-700" : "text-indigo-700";
  const labelColor = isOverdue ? "text-red-500" : isUrgent ? "text-amber-500" : "text-indigo-500";

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Key Dates</h2>

      {/* Primary countdown */}
      <div className={`rounded-xl border bg-gradient-to-b ${cardBorder} to-white px-4 py-4 text-center`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${labelColor} leading-tight`}>
          {primary.title}
        </p>
        <p className={`mt-2 text-5xl font-bold tabular-nums leading-none ${numColor}`}>
          {isOverdue ? Math.abs(primary.days) : primary.days}
        </p>
        <p className={`mt-1 text-xs font-medium ${labelColor}`}>
          {isOverdue
            ? `day${Math.abs(primary.days) !== 1 ? "s" : ""} overdue`
            : `day${primary.days !== 1 ? "s" : ""} remaining`}
        </p>
        <p className="mt-2.5 text-[11px] text-gray-400">Due {fmtShort(primary.resolvedDate)}</p>
        {primary.recurrence === "annual" && (
          <span className="mt-2 inline-block rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-gray-400">
            Annual
          </span>
        )}
      </div>

      {/* Remaining dates */}
      {rest.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {rest.map((date) => {
            const over = date.days < 0;
            const urgent = !over && date.days <= 30;
            return (
              <div key={date.id} className="flex items-center gap-2.5 px-3 py-2.5">
                {/* Calendar tile */}
                <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-gray-100 bg-gray-50">
                  <span className="text-xs font-bold leading-none text-gray-800">
                    {new Date(date.resolvedDate).getDate()}
                  </span>
                  <span className="text-[9px] font-medium uppercase leading-tight text-gray-500">
                    {new Date(date.resolvedDate).toLocaleDateString("en-AU", { month: "short" })}
                  </span>
                </div>
                {/* Title + date */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">{date.title}</p>
                  <p className="text-[10px] text-gray-400">{fmtShort(date.resolvedDate)}</p>
                </div>
                {/* Countdown */}
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    over ? "text-red-600" : urgent ? "text-amber-600" : "text-gray-500"
                  }`}
                >
                  {over ? `-${Math.abs(date.days)}d` : `${date.days}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
