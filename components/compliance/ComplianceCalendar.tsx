"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { RegulationKeyDate } from "@/lib/types/compliance";

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

interface ObligationDate extends RegulationKeyDate {
  resolvedDate: string;
  days: number;
  regulationShortName: string;
}

export function ComplianceCalendar() {
  const { activeRegulations, regulations, fetchRegulations } = useComplianceStore();
  const [dates, setDates] = useState<ObligationDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (regulations.length === 0) fetchRegulations();
  }, [regulations.length, fetchRegulations]);

  useEffect(() => {
    if (activeRegulations.length === 0) {
      setDates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      activeRegulations.map((ar) =>
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
              };
            });
          }),
      ),
    ).then((allDates) => {
      setDates(allDates.flat().sort((a, b) => a.days - b.days));
      setLoading(false);
    });
  }, [activeRegulations, regulations]);

  return (
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
            const mon = dateObj
              .toLocaleDateString("en-AU", { month: "short" })
              .toUpperCase();
            const label = `${mon} ${String(d).padStart(2, "0")}`;
            return (
              <div
                key={date.id}
                className={`flex gap-4 py-3 ${
                  i < dates.length - 1 ? "border-b border-dashed border-gray-200" : ""
                }`}
              >
                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-700">
                  {label}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{date.title}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-indigo-600">
                      {date.regulationShortName}
                    </span>
                    {date.recurrence === "annual" && (
                      <>{" · "}<span className="text-gray-400">Annual</span></>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 self-center text-xs font-semibold tabular-nums ${
                    over ? "text-red-600" : urgent ? "text-amber-600" : "text-gray-400"
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
