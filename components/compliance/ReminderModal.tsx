"use client";

import { useEffect, useRef, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { ReminderChannel, ReminderTiming } from "@/lib/types/compliance";

interface ReminderModalProps {
  keyDateId: string;
  regulationId: string;
  keyDateTitle: string;
  dueDate: string; // formatted display string e.g. "31 Mar 2026"
  onClose: () => void;
}

const CHANNELS: { value: ReminderChannel; label: string }[] = [
  { value: "email", label: "via Email" },
  { value: "text", label: "via Text" },
];

const TIMINGS: { value: ReminderTiming; label: string }[] = [
  { value: "1d", label: "1 Day Prior" },
  { value: "1w", label: "1 Week Prior" },
  { value: "1m", label: "1 Month Prior" },
  { value: "custom", label: "Custom" },
];

export function ReminderModal({
  keyDateId,
  regulationId,
  keyDateTitle,
  dueDate,
  onClose,
}: ReminderModalProps) {
  const { addReminder, deleteReminder, getRemindersForKeyDate } = useComplianceStore();
  const existing = getRemindersForKeyDate(keyDateId);

  const [channel, setChannel] = useState<ReminderChannel>("email");
  const [timing, setTiming] = useState<ReminderTiming>("1w");
  const [customDate, setCustomDate] = useState("");

  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleAdd() {
    if (timing === "custom" && !customDate) return;
    addReminder({
      keyDateId,
      regulationId,
      channel,
      timing,
      customDate: timing === "custom" ? customDate : undefined,
    });
  }

  function timingLabel(r: (typeof existing)[0]) {
    if (r.timing === "custom" && r.customDate) {
      return `Custom · ${new Date(r.customDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return TIMINGS.find((t) => t.value === r.timing)?.label ?? r.timing;
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Set Reminder
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{keyDateTitle}</p>
            <p className="text-xs text-gray-400">Due {dueDate}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Channel button group */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">Notify me</p>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {CHANNELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setChannel(value)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    channel === value
                      ? "bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing button group */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-500">When</p>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {TIMINGS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTiming(value)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    timing === value
                      ? "bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date picker */}
            {timing === "custom" && (
              <div className="mt-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={timing === "custom" && !customDate}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Add Reminder
          </button>

          {/* Existing reminders */}
          {existing.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Scheduled reminders</p>
              <ul className="space-y-1.5">
                {existing.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-gray-800">
                        {r.channel === "email" ? "Email" : "Text"} · {timingLabel(r)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500"
                      aria-label="Delete reminder"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
