"use client";

import { useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import { useUser, useOrganization } from "@clerk/nextjs";
import { getProcessRating } from "@/lib/types/compliance";
import { computeProcessesFromAnswers } from "@/lib/process-computation";
import type { ExecutiveSummaryData } from "./ExecutiveSummaryDoc";
import type { AuditReportData } from "./AuditReportDoc";

type ReportType = "executive" | "audit";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, locks the audit report to this regulation and hides the selector. */
  regulationId?: string;
}

export function ReportModal({ isOpen, onClose, regulationId }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [selectedRegulationId, setSelectedRegulationId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user: clerkUser } = useUser();
  const { organization } = useOrganization();
  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser.fullName ?? clerkUser.firstName ?? "",
      }
    : null;
  const {
    activeRegulations,
    orgProfile,
    regulations,
    teamMembers,
    getLastCompletedAssessment,
  } = useComplianceStore();

  if (!isOpen) return null;

  // Regulations with at least one completed assessment
  const completedRegulations = activeRegulations.filter(
    (al) => getLastCompletedAssessment(al.regulationId) !== undefined,
  );

  // Whether we have something to report on
  const hasCompletedAssessment = regulationId
    ? getLastCompletedAssessment(regulationId) !== undefined
    : completedRegulations.length > 0;

  const firstCompletedId = completedRegulations[0]?.regulationId ?? "";
  // For audit: use locked regulationId, then selection, then first completed
  const auditRegId = regulationId ?? (selectedRegulationId || firstCompletedId);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      if (reportType === "executive") {
        const allComputedProcesses = completedRegulations.flatMap((al) => {
          const completed = getLastCompletedAssessment(al.regulationId);
          if (!completed) return [];
          return computeProcessesFromAnswers(completed.sectionAnswers);
        });
        const compliantProcesses = allComputedProcesses.filter(
          (p) => getProcessRating(p) === "green",
        );
        const healthScore =
          allComputedProcesses.length > 0
            ? Math.round(
                (compliantProcesses.length / allComputedProcesses.length) * 100,
              )
            : 0;

        const regulationSummaries = completedRegulations.map((al) => {
          const reg = regulations.find((r) => r.id === al.regulationId);
          const completed = getLastCompletedAssessment(al.regulationId);
          const processes = completed
            ? computeProcessesFromAnswers(completed.sectionAnswers)
            : al.processes;
          return {
            regulationId: al.regulationId,
            name: reg?.name ?? al.regulationId,
            shortName: reg?.shortName ?? al.regulationId,
            agency: reg?.agency ?? "",
            lastAssessment: completed,
            processes,
          };
        });

        const data: ExecutiveSummaryData = {
          user,
          companyName: organization?.name ?? "Your Organisation",
          healthScore,
          compliantProcesses: compliantProcesses.length,
          totalProcesses: allComputedProcesses.length,
          teamMembers,
          regulationSummaries,
          generatedAt: new Date().toISOString(),
        };

        const { generateExecutiveSummaryPDF } = await import("./ExecutiveSummaryDoc");
        const url = await generateExecutiveSummaryPDF(data);
        window.open(url, "_blank");
      } else {
        const regId = auditRegId;
        const activeRegulation = activeRegulations.find((al) => al.regulationId === regId);
        const regulation = regulations.find((r) => r.id === regId);
        const lastCompleted = getLastCompletedAssessment(regId);

        if (!activeRegulation || !regulation || !lastCompleted) {
          setError("Could not find a completed assessment for this regulation.");
          setGenerating(false);
          return;
        }

        const data: AuditReportData = {
          regulation,
          activeRegulation,
          orgName: organization?.name ?? "Your Organisation",
          orgProfile: orgProfile ?? null,
          allAssessments: activeRegulation.selfAssessments,
          sectionAnswers: lastCompleted.sectionAnswers,
          teamMembers,
          generatedAt: new Date().toISOString(),
        };

        const { generateAuditReportPDF } = await import("./AuditReportDoc");
        const url = await generateAuditReportPDF(data);
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!hasCompletedAssessment ? (
          /* ── No completed assessment — informational state ── */
          <>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    No completed self-assessment
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Reports are generated from your completed self-assessment data. Complete
                    a self-assessment for{" "}
                    {regulationId
                      ? (regulations.find((r) => r.id === regulationId)?.shortName ?? "this regulation")
                      : "at least one regulation"}{" "}
                    to unlock report generation.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          /* ── Normal state ── */
          <>
            <p className="mt-1 text-sm text-gray-500">
              Choose a report type and generate a PDF that opens in a new tab.
            </p>

            {/* Report type cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {/* Executive Summary */}
              <button
                type="button"
                onClick={() => setReportType("executive")}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  reportType === "executive"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                    reportType === "executive" ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`h-5 w-5 ${reportType === "executive" ? "text-white" : "text-gray-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    reportType === "executive" ? "text-indigo-700" : "text-gray-900"
                  }`}
                >
                  Executive Summary
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  High-level overview across all completed regulations
                </p>
              </button>

              {/* Audit Report */}
              <button
                type="button"
                onClick={() => setReportType("audit")}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  reportType === "audit"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                    reportType === "audit" ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`h-5 w-5 ${reportType === "audit" ? "text-white" : "text-gray-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    reportType === "audit" ? "text-indigo-700" : "text-gray-900"
                  }`}
                >
                  Audit Report
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Comprehensive detail for government audit scenarios
                </p>
              </button>
            </div>

            {/* Audit regulation selector — hidden when locked to a specific regulation */}
            {reportType === "audit" && !regulationId && (
              <div className="mt-4">
                <label
                  htmlFor="audit-regulation"
                  className="block text-sm font-medium text-gray-700"
                >
                  Select Regulation
                </label>
                <select
                  id="audit-regulation"
                  value={auditRegId}
                  onChange={(e) => setSelectedRegulationId(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {completedRegulations.map((al) => {
                    const reg = regulations.find((r) => r.id === al.regulationId);
                    return (
                      <option key={al.regulationId} value={al.regulationId}>
                        {reg?.name ?? al.regulationId}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-xs text-gray-400">
                  Only regulations with a completed self-assessment can be reported on.
                </p>
              </div>
            )}

            {/* Locked regulation badge */}
            {reportType === "audit" && regulationId && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">
                  {regulations.find((r) => r.id === regulationId)?.name ?? regulationId}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 4.418A8 8 0 014 12z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Generate PDF
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
