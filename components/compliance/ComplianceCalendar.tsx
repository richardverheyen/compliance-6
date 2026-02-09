"use client";

import { useEffect } from "react";
import { useComplianceStore } from "@/lib/compliance-store";

export function ComplianceCalendar() {
  const { calendarEvents, fetchCalendarEvents } = useComplianceStore();

  useEffect(() => {
    if (calendarEvents.length === 0) {
      fetchCalendarEvents();
    }
  }, [calendarEvents.length, fetchCalendarEvents]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Compliance Calendar 2026
      </h2>
      <div className="mt-4 space-y-0">
        {calendarEvents.map((event, i) => (
          <div
            key={i}
            className={`flex gap-4 py-3 ${
              i < calendarEvents.length - 1 ? "border-b border-dashed border-gray-200" : ""
            }`}
          >
            <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-700">
              {event.date}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {event.title}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium text-indigo-600">
                  {event.agency}
                </span>
                {" — "}
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
