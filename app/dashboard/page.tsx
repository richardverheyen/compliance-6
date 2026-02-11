"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { useComplianceStore } from "@/lib/compliance-store";
import { getProcessRating } from "@/lib/types/compliance";
import type { LegislationProcess } from "@/lib/types/compliance";
import { ProcessTable } from "@/components/compliance/ProcessTable";
import { ComplianceCalendar } from "@/components/compliance/ComplianceCalendar";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activeLegislations, legislations, teamMembers, fetchTeam } =
    useComplianceStore();

  useEffect(() => {
    if (teamMembers.length === 0) {
      fetchTeam();
    }
  }, [teamMembers.length, fetchTeam]);

  // Calculate health KPI across all computed processes (from form answers)
  const allComputedProcesses = activeLegislations.flatMap((al) => al.processes);
  const compliantProcesses = allComputedProcesses.filter(
    (p) => getProcessRating(p) === "green",
  );
  const healthScore =
    allComputedProcesses.length > 0
      ? Math.round((compliantProcesses.length / allComputedProcesses.length) * 100)
      : 0;
  const healthPass = healthScore > 70;

  // Collect LegislationProcess items from parent Legislation for each active legislation
  const allLegislationProcesses: LegislationProcess[] = [];
  for (const al of activeLegislations) {
    const leg = legislations.find((l) => l.id === al.legislationId);
    if (leg?.processes) {
      allLegislationProcesses.push(...leg.processes);
    }
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </p>

        {activeLegislations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No active legislations
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Get started by browsing available legislations and completing an
              introduction form.
            </p>
            <Link
              href="/dashboard/legislations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Browse Legislations
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="space-y-8">
              {/* Health KPI */}
              <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white p-6">
                <div
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 ${
                    healthPass
                      ? "border-green-500 text-green-600"
                      : "border-red-500 text-red-600"
                  }`}
                >
                  <span className="text-2xl font-bold">{healthScore}%</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Overall Compliance Health
                  </h2>
                  <p className="text-sm text-gray-500">
                    {compliantProcesses.length} of {allComputedProcesses.length} sections
                    fully compliant
                  </p>
                </div>
              </div>

              {/* Business Processes table */}
              {allLegislationProcesses.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Business Processes
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Key processes across your active legislations
                  </p>
                  <div className="mt-3">
                    <ProcessTable processes={allLegislationProcesses} />
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div>
              <ComplianceCalendar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
