"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";

export default function LegislationsPage() {
  const { legislations, activeLegislations, isLoading, fetchLegislations } =
    useComplianceStore();

  useEffect(() => {
    fetchLegislations();
  }, [fetchLegislations]);

  if (isLoading && legislations.length === 0) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading legislations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Legislations</h1>
        <p className="mt-2 text-gray-600">
          Browse available legislations and activate them for your business.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {legislations.map((leg) => {
            const isActive = activeLegislations.some(
              (a) => a.legislationId === leg.id,
            );
            return (
              <Link
                key={leg.id}
                href={`/dashboard/legislations/${leg.id}`}
                className="group rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    {leg.shortName}
                  </h3>
                  {isActive && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  )}
                </div>
                <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {leg.agency}
                </span>
                <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                  {leg.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
