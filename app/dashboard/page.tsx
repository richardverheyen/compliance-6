"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { useComplianceStore } from "@/lib/compliance-store";
import type { ActiveRegulation, RegulationProcess, SelfAssessment } from "@/lib/types/compliance";
import { ProcessTable } from "@/components/compliance/ProcessTable";
import { ComplianceCalendar } from "@/components/compliance/ComplianceCalendar";
import { AgencyLogo } from "@/components/compliance/AgencyLogo";

const ReportModal = dynamic(
  () => import("@/components/reports/ReportModal").then((m) => m.ReportModal),
  { ssr: false },
);

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function RegulationTile({
  al,
  regulationName,
  regulationShortName,
  regulationAgency,
  activeAssessment,
  lastCompleted,
}: {
  al: ActiveRegulation;
  regulationName: string;
  regulationShortName: string;
  regulationAgency: string;
  activeAssessment: SelfAssessment | undefined;
  lastCompleted: SelfAssessment | undefined;
}) {
  const href = `/dashboard/regulations/${al.regulationId}`;
  const inProgress = !!activeAssessment;

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border bg-white p-6 ${
        inProgress
          ? "border-indigo-200 shadow-sm ring-1 ring-indigo-100"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <AgencyLogo agency={regulationAgency} />
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 leading-tight">
            {regulationShortName}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">{regulationAgency}</p>
        </div>
      </div>

      <p className={`text-sm ${inProgress ? "text-amber-700" : "text-gray-500"}`}>
        {inProgress ? (
          <>Assessment in progress since {formatDate(activeAssessment.startedAt)}</>
        ) : lastCompleted ? (
          <>Last assessed: {formatDate(lastCompleted.completedAt!)}</>
        ) : (
          <>No assessments completed yet</>
        )}
      </p>

      <div>
        <Link
          href={href}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
            inProgress
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {inProgress
            ? "Continue Self Assessment →"
            : lastCompleted
            ? "Start New Assessment →"
            : "Start First Assessment →"}
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    activeRegulations,
    regulations,
    teamMembers,
    fetchTeam,
    getActiveAssessment,
    getLastCompletedAssessment,
  } = useComplianceStore();
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (teamMembers.length === 0) {
      fetchTeam();
    }
  }, [teamMembers.length, fetchTeam]);

  // Collect RegulationProcess items from parent Regulation for each active regulation
  const allRegulationProcesses: RegulationProcess[] = [];
  for (const al of activeRegulations) {
    const leg = regulations.find((l) => l.id === al.regulationId);
    if (leg?.processes) {
      allRegulationProcesses.push(...leg.processes);
    }
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back{user?.name ? `, ${user.name}` : ""}!
            </p>
          </div>
          {activeRegulations.length > 0 && (
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generate Report
            </button>
          )}
        </div>

        {activeRegulations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No active regulations
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Get started by browsing available regulations and completing an
              introduction form.
            </p>
            <Link
              href="/dashboard/regulations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Browse Regulations
            </Link>
          </div>
        ) : (
          <>
            {/* Regulation tiles — full width */}
            <div className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {activeRegulations.map((al) => {
                  const reg = regulations.find((l) => l.id === al.regulationId);
                  return (
                    <RegulationTile
                      key={al.regulationId}
                      al={al}
                      regulationName={reg?.name ?? al.regulationId}
                      regulationShortName={reg?.shortName ?? al.regulationId}
                      regulationAgency={reg?.agency ?? ""}
                      activeAssessment={getActiveAssessment(al.regulationId)}
                      lastCompleted={getLastCompletedAssessment(al.regulationId)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Two-column: Business Processes | Calendar */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Left column */}
              <div>
                {allRegulationProcesses.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Business Processes
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Key processes across your active regulations
                    </p>
                    <div className="mt-3">
                      <ProcessTable processes={allRegulationProcesses} />
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div>
                <ComplianceCalendar />
              </div>
            </div>
          </>
        )}
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
