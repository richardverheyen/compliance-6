"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { RegulationKeyDate, Reminder } from "@/lib/types/compliance";
import { ReminderModal } from "@/components/compliance/ReminderModal";

function nextOccurrence(isoDate: string, recurrence: "annual" | "once"): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (recurrence === "annual" && date < today) {
    date.setFullYear(date.getFullYear() + 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDisplay(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function reminderDisplayDate(reminder: Reminder, resolvedDate: string): string {
  if (reminder.timing === "custom" && reminder.customDate) {
    return fmtDisplay(reminder.customDate);
  }
  const [y, m, d] = resolvedDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (reminder.timing === "1d") date.setDate(date.getDate() - 1);
  else if (reminder.timing === "1w") date.setDate(date.getDate() - 7);
  else if (reminder.timing === "1m") date.setMonth(date.getMonth() - 1);
  return fmtDisplay(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  );
}

interface ObligationDate extends RegulationKeyDate {
  resolvedDate: string;
  days: number;
  regulationShortName: string;
  regulationId: string;
}

function BellIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="h-4 w-4 text-indigo-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
        <circle cx="15" cy="4" r="3" fill="#ef4444" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.586V8a5 5 0 00-10 0v2.586l-.707.707A1 1 0 005 13h10a1 1 0 00.707-1.707L15 10.586z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  );
}

export function ComplianceCalendar({ regulationId }: { regulationId?: string } = {}) {
  const { activeRegulations, regulations, getRemindersForKeyDate } =
    useComplianceStore();
  const [dates, setDates] = useState<ObligationDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<ObligationDate | null>(null);

  // If a regulationId is provided, scope to just that one; otherwise use all active regulations.
  const targets = regulationId
    ? activeRegulations.filter((ar) => ar.regulationId === regulationId)
    : activeRegulations;

  useEffect(() => {
    if (targets.length === 0) {
      setDates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      targets.map((ar) =>
        fetch(`/api/compliance/regulations/${ar.regulationId}/key-dates`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: RegulationKeyDate[]) => {
            const reg = regulations.find((l) => l.id === ar.regulationId);
            return data.map((d) => {
              const resolvedDate = nextOccurrence(d.isoDate, d.recurrence);
              return {
                ...d,
                resolvedDate,
                days: daysUntil(resolvedDate),
                regulationShortName: reg?.shortName ?? ar.regulationId,
                regulationId: ar.regulationId,
              };
            });
          }),
      ),
    ).then((allDates) => {
      setDates(allDates.flat().sort((a, b) => a.days - b.days));
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regulationId, activeRegulations, regulations]);

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Obligation Calendar</h2>
        {loading ? (
          <p className="mt-4 text-sm text-gray-400">Loading…</p>
        ) : dates.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No obligations found.</p>
        ) : (
          <div className="mt-4 space-y-0">
            {dates.map((date, i) => {
              const over = date.days < 0;
              const urgent = !over && date.days <= 30;
              const [y, m, d] = date.resolvedDate.split("-").map(Number);
              const dateObj = new Date(y, m - 1, d);
              const mon = dateObj.toLocaleDateString("en-AU", { month: "short" });
              const reminders = getRemindersForKeyDate(date.id);
              const hasReminder = reminders.length > 0;
              return (
                <div
                  key={date.id}
                  className={`flex items-center gap-4 py-3 ${
                    i < dates.length - 1 ? "border-b border-dashed border-gray-200" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold leading-none text-gray-800">{d}</span>
                    <span className="text-[9px] font-medium uppercase leading-tight text-gray-500">{mon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{date.title}</p>
                    {!regulationId && (
                      <p className="truncate text-xs font-medium text-indigo-600">
                        {date.regulationShortName}
                      </p>
                    )}
                    {hasReminder && (
                      <p className="mt-0.5 text-xs text-indigo-500">
                        {reminders.length === 1
                          ? `Reminder ${reminderDisplayDate(reminders[0], date.resolvedDate)}`
                          : `${reminders.length} reminders set`}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      over ? "text-red-600" : urgent ? "text-amber-600" : "text-gray-400"
                    }`}
                  >
                    {over ? `-${Math.abs(date.days)}d` : `${date.days}d`}
                  </span>
                  {/* Bell icon — compact trigger */}
                  <button
                    onClick={() => setModalDate(date)}
                    title={hasReminder ? "Reminder set — click to manage" : "Set a reminder"}
                    className={`shrink-0 rounded-md p-1 transition-colors ${
                      hasReminder
                        ? "text-indigo-600 hover:bg-indigo-50"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    }`}
                  >
                    <BellIcon active={hasReminder} />
                    <span className="sr-only">{hasReminder ? "Manage reminder" : "Set reminder"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalDate && (
        <ReminderModal
          keyDateId={modalDate.id}
          regulationId={modalDate.regulationId}
          keyDateTitle={modalDate.title}
          dueDate={fmtDisplay(modalDate.resolvedDate)}
          onClose={() => setModalDate(null)}
        />
      )}
    </>
  );
}
