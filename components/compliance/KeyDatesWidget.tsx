"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { RegulationKeyDate } from "@/lib/types/compliance";
import { ReminderModal } from "@/components/compliance/ReminderModal";

/** Parse a YYYY-MM-DD string as a local date (avoids UTC-offset shifting). */
function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Annual dates roll to next year once they've passed. */
function nextOccurrence(isoDate: string, recurrence: "annual" | "once"): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseLocalDate(isoDate);
  if (recurrence === "annual" && d < today) {
    d.setFullYear(d.getFullYear() + 1);
  }
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(isoDate);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtShort(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ResolvedDate extends RegulationKeyDate {
  resolvedDate: string;
  days: number;
}

interface ModalTarget {
  keyDateId: string;
  keyDateTitle: string;
  dueDate: string;
}

function BellIconSmall({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg className="h-3.5 w-3.5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
        <circle cx="15" cy="4" r="3" fill="#ef4444" />
      </svg>
    );
  }
  return (
    <svg
      className="h-3.5 w-3.5 text-gray-400"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.586V8a5 5 0 00-10 0v2.586l-.707.707A1 1 0 005 13h10a1 1 0 00.707-1.707L15 10.586z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  );
}

export function KeyDatesWidget({ regulationId }: { regulationId: string }) {
  const { getRemindersForKeyDate } = useComplianceStore();
  const [dates, setDates] = useState<ResolvedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalTarget | null>(null);

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

  const primaryHasReminder = getRemindersForKeyDate(primary.id).length > 0;

  function openModal(date: ResolvedDate) {
    setModal({
      keyDateId: date.id,
      keyDateTitle: date.title,
      dueDate: fmtShort(date.resolvedDate),
    });
  }

  return (
    <>
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
          {/* Full reminder button on the large primary card */}
          <button
            onClick={() => openModal(primary)}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              primaryHasReminder
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg
              className={`h-3.5 w-3.5 ${primaryHasReminder ? "text-indigo-600" : "text-gray-400"}`}
              viewBox="0 0 20 20"
              fill={primaryHasReminder ? "currentColor" : "none"}
              stroke={primaryHasReminder ? "none" : "currentColor"}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {primaryHasReminder ? (
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.586V8a5 5 0 00-10 0v2.586l-.707.707A1 1 0 005 13h10a1 1 0 00.707-1.707L15 10.586z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 17a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                </>
              )}
            </svg>
            {primaryHasReminder ? "Reminder set" : "Send me a reminder"}
          </button>
        </div>

        {/* Remaining dates */}
        {rest.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {rest.map((date) => {
              const over = date.days < 0;
              const urgent = !over && date.days <= 30;
              const hasReminder = getRemindersForKeyDate(date.id).length > 0;
              return (
                <div key={date.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  {/* Calendar tile */}
                  <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold leading-none text-gray-800">
                      {parseLocalDate(date.resolvedDate).getDate()}
                    </span>
                    <span className="text-[9px] font-medium uppercase leading-tight text-gray-500">
                      {parseLocalDate(date.resolvedDate).toLocaleDateString("en-AU", { month: "short" })}
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
                  {/* Bell icon — compact trigger */}
                  <button
                    onClick={() => openModal(date)}
                    title={hasReminder ? "Reminder set — click to manage" : "Set a reminder"}
                    className={`shrink-0 rounded p-0.5 transition-colors ${
                      hasReminder
                        ? "text-indigo-600 hover:bg-indigo-50"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <BellIconSmall active={hasReminder} />
                    <span className="sr-only">{hasReminder ? "Manage reminder" : "Set reminder"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ReminderModal
          keyDateId={modal.keyDateId}
          regulationId={regulationId}
          keyDateTitle={modal.keyDateTitle}
          dueDate={modal.dueDate}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
