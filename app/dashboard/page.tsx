"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useComplianceStore } from "@/lib/compliance-store";
import type { ActiveRegulation, SelfAssessment } from "@/lib/types/compliance";
import type { RegulationManifest } from "@/lib/types/regulation-content";
import { getRegulationProcessForSlug, getProcessIdForSlug } from "@/lib/process-computation";
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

interface ConfirmedProcess {
  slug: string;
  title: string;
  regulationId: string;
  agency: string;
  frequencyLabel: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const {
    activeRegulations,
    regulations,
    getSectionAnswers,
    getActiveAssessment,
    getLastCompletedAssessment,
  } = useComplianceStore();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [manifests, setManifests] = useState<Record<string, RegulationManifest>>({});
  const [loadingManifests, setLoadingManifests] = useState(true);

  useEffect(() => {
    if (activeRegulations.length === 0) {
      setLoadingManifests(false);
      return;
    }
    setLoadingManifests(true);
    Promise.all(
      activeRegulations.map((al) =>
        fetch(`/api/compliance/regulations/${al.regulationId}/manifest`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data): [string, RegulationManifest | null] => [al.regulationId, data])
      )
    ).then((results) => {
      const map: Record<string, RegulationManifest> = {};
      for (const [id, manifest] of results) {
        if (manifest) map[id] = manifest;
      }
      setManifests(map);
      setLoadingManifests(false);
    });
  }, [activeRegulations]);

  const confirmedProcesses = useMemo<ConfirmedProcess[]>(() => {
    const list: ConfirmedProcess[] = [];
    for (const al of activeRegulations) {
      const manifest = manifests[al.regulationId];
      if (!manifest) continue;
      const regulation = regulations.find((r) => r.id === al.regulationId);
      if (!regulation) continue;
      for (const entry of manifest.processList) {
        const answers = getSectionAnswers(al.regulationId, entry.id);
        if (answers["process-exists"] !== "Yes") continue;
        if (!getProcessIdForSlug(entry.id)) continue;
        const regProcess = getRegulationProcessForSlug(entry.id, regulation.processes);
        list.push({
          slug: entry.id,
          title: entry.title,
          regulationId: al.regulationId,
          agency: regulation.agency,
          frequencyLabel: regProcess?.frequencyLabel ?? "",
        });
      }
    }
    return list;
  }, [activeRegulations, manifests, regulations, getSectionAnswers]);

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
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
              {/* Calendar — first on mobile, right column on desktop */}
              <div className="order-1 lg:order-2">
                <ComplianceCalendar />
              </div>

              {/* Business Processes — second on mobile, left column on desktop */}
              <div className="order-2 lg:order-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Business Processes
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Confirmed processes across your active regulations
                </p>
                <div className="mt-3">
                  {loadingManifests ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      Loading…
                    </div>
                  ) : confirmedProcesses.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 p-6 text-center">
                      <p className="text-sm text-gray-500">No confirmed processes yet.</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Complete your self-assessment to confirm which processes apply.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <div className="divide-y divide-gray-100">
                        {confirmedProcesses.map((proc) => (
                          <Link
                            key={`${proc.regulationId}-${proc.slug}`}
                            href={`/dashboard/processes/${proc.slug}`}
                            className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50"
                          >
                            <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                              {proc.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              {proc.frequencyLabel && (
                                <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 sm:inline-block">
                                  {proc.frequencyLabel}
                                </span>
                              )}
                              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                {proc.agency}
                              </span>
                              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 px-5 py-3">
                        <Link
                          href="/dashboard/processes"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          View all processes →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
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
