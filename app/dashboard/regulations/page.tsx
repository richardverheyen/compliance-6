"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { AgencyLogo } from "@/components/compliance/AgencyLogo";

export default function RegulationsPage() {
  const { regulations, activeRegulations, isLoading, fetchRegulations } =
    useComplianceStore();

  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  if (isLoading && regulations.length === 0) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading regulations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Regulations</h1>
        <p className="mt-2 text-gray-600">
          Browse available regulations and activate them for your business.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {regulations.map((leg) => {
            const isActive = activeRegulations.some(
              (a) => a.regulationId === leg.id,
            );
            return (
              <Link
                key={leg.id}
                href={`/dashboard/regulations/${leg.id}`}
                className="group rounded-xl border border-gray-200 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AgencyLogo agency={leg.agency} size={40} />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600">
                        {leg.shortName}
                      </h3>
                      <span className="mt-0.5 inline-block text-xs text-gray-500">
                        {leg.agency}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  )}
                </div>
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
