"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { useUser } from "@clerk/nextjs";
import type { Regulation, SelfAssessment } from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";
import { AgencyLogo } from "@/components/compliance/AgencyLogo";
import MermaidDiagram from "@/components/compliance/MermaidDiagram";
import { KeyDatesWidget } from "@/components/compliance/KeyDatesWidget";
import type { IntroductionData, RegulationManifest, ProcessListEntry } from "@/lib/types/regulation-content";
import { usePdfPanel } from "./_context";

// Returns true when a process form entry is visible given scoping answers.
function isProcessUnlocked(entry: ProcessListEntry, introAnswers: Record<string, string>): boolean {
  if (!entry.gatedBy) return true;
  return introAnswers[entry.gatedBy] === "Yes";
}

const locations = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Northern Territory",
  "Australian Capital Territory",
];

// Generic: derive answers where "Yes" if any listed controls = "Yes"
function deriveAnswers(
  base: Record<string, string>,
  intro: IntroductionData | null,
): Record<string, string> {
  if (!intro?.derived) return { ...base };
  const derived = { ...base };
  for (const [targetId, rule] of Object.entries(intro.derived)) {
    if (rule.from.some((k) => derived[k] === "Yes")) {
      derived[targetId] = "Yes";
    }
  }
  return derived;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


export default function RegulationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { pdfVisible, togglePdf, pdfUrl } = usePdfPanel();
  const { user } = useUser();

  const {
    regulations,
    fetchRegulations,
    getActiveRegulation,
    activateRegulation,
    getRegulationProcessOwner,
    getTeamMembersWithAuth,
    getActiveAssessment,
    getLastCompletedAssessment,
    startSelfAssessment,
    completeSelfAssessment,
  } = useComplianceStore();

  const [regulation, setRegulation] = useState<Regulation | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [introAnswers, setIntroAnswers] = useState<Record<string, string>>({});
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [assignModal, setAssignModal] = useState<{ processId: string; processName: string } | null>(null);

  // Self-assessment UI state
  const [showScopingForm, setShowScopingForm] = useState(false);
  const [scopingAnswers, setScopingAnswers] = useState<Record<string, string>>({});
  const [completedMessage, setCompletedMessage] = useState(false);

  // Dynamically fetched regulation content
  const [introData, setIntroData] = useState<IntroductionData | null>(null);
  const [manifest, setManifest] = useState<RegulationManifest | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (regulations.length === 0) {
      fetchRegulations();
    }
  }, [regulations.length, fetchRegulations]);

  useEffect(() => {
    setRegulation(regulations.find((l) => l.id === id));
  }, [regulations, id]);

  // Fetch introduction and manifest in parallel
  useEffect(() => {
    setContentLoading(true);
    Promise.all([
      fetch(`/api/compliance/regulations/${id}/introduction`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/compliance/regulations/${id}/manifest`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([intro, mf]) => {
      setIntroData(intro ?? null);
      setManifest(mf ?? null);
      setContentLoading(false);
    });
  }, [id]);

  const active = getActiveRegulation(id);
  const activeAssessment = active ? getActiveAssessment(id) : undefined;
  const lastCompleted = active ? getLastCompletedAssessment(id) : undefined;

  const completedAssessments: SelfAssessment[] = (active?.selfAssessments ?? [])
    .filter((s) => s.status === "completed")
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  // Intro answers from the current or last completed assessment
  const currentIntroAnswers =
    activeAssessment?.sectionAnswers["risk-assessment"] ??
    lastCompleted?.sectionAnswers["risk-assessment"] ??
    {};

  // Completion computation for State B
  const assessmentVisibleEntries = (manifest?.processList ?? []).filter((e) =>
    isProcessUnlocked(e, currentIntroAnswers),
  );
  const incompleteCount = activeAssessment
    ? assessmentVisibleEntries.filter((e) => {
        const bp = active?.processes.find((p) => p.id === e.id);
        return !bp || getProcessRating(bp) !== "green";
      }).length
    : 0;
  const allAssessmentComplete =
    !!activeAssessment && assessmentVisibleEntries.length > 0 && incompleteCount === 0;

  // Per-entry completion rating (only meaningful in state B)
  function getEntryCompletion(entry: ProcessListEntry): "none" | "in-progress" | "green" {
    if (!activeAssessment) return "none";
    const entryAnswers = activeAssessment.sectionAnswers[entry.id];
    const hasAnyAnswers = entryAnswers && Object.keys(entryAnswers).length > 0;
    if (!hasAnyAnswers) return "none";
    const bp = active?.processes.find((p) => p.id === entry.id);
    if (!bp) return "none";
    return getProcessRating(bp) === "green" ? "green" : "in-progress";
  }

  function getFormLastCompleted(entryId: string): SelfAssessment | null {
    return (
      completedAssessments.find(
        (a) => a.sectionAnswers[entryId] && Object.keys(a.sectionAnswers[entryId]).length > 0,
      ) ?? null
    );
  }

  if (!regulation || contentLoading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    const fullAnswers = deriveAnswers(introAnswers, introData);
    activateRegulation(
      id,
      {
        businessName,
        location,
        foundingYear: Number(foundingYear),
        employeeCount: Number(employeeCount),
        services: selectedServices,
      },
      fullAnswers,
    );
    router.push(`/dashboard/regulations/${id}`);
    setShowActivationForm(false);
  }

  function handleStartAssessment(e: React.FormEvent) {
    e.preventDefault();
    const fullAnswers = deriveAnswers(scopingAnswers, introData);
    startSelfAssessment(id, fullAnswers);
    setShowScopingForm(false);
    setScopingAnswers({});
    setCompletedMessage(false);
  }

  function handleCompleteAssessment() {
    completeSelfAssessment(id, user?.fullName ?? user?.firstName ?? "Unknown");
    setCompletedMessage(true);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/regulations"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Regulations
        </Link>
        {pdfUrl && (
          <button
            onClick={togglePdf}
            className="hidden lg:flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfVisible ? "Hide regulation documents" : "Show regulation documents"}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <AgencyLogo agency={regulation.agency} size={56} />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{regulation.name}</h1>
          <div className="mt-1.5 flex gap-3">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {regulation.agency}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {regulation.jurisdiction}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-600">{regulation.description}</p>
      {active && active.businessProfile.services.length > 0 && (
        <p className="mt-2 text-sm font-medium text-indigo-700">
          Applies to you as a {active.businessProfile.services.join(", ")} provider.
        </p>
      )}

      <div className="mt-8">
            {showActivationForm ? (
              /* ── Activation form — replaces the entire left column ── */
              <form onSubmit={handleActivate} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Begin Compliance Self-Assessment</h2>
                    <p className="mt-0.5 text-sm text-gray-600">
                      Complete your business profile and scoping questions to activate compliance tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowActivationForm(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                {/* Business Profile */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-base font-semibold text-gray-900">Business Profile</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Name</label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <select
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">Select a state or territory</option>
                        {locations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Founding Year</label>
                        <input
                          type="number"
                          required
                          min="1900"
                          max={new Date().getFullYear()}
                          value={foundingYear}
                          onChange={(e) => setFoundingYear(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Employee Count</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={employeeCount}
                          onChange={(e) => setEmployeeCount(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Applicable Services</label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {regulation.applicableServices.map((service) => (
                          <label key={service} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service)}
                              onChange={() => toggleService(service)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {service}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Introduction / Scoping form — only shown if regulation has one */}
                {introData && manifest?.hasIntroductionForm && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-base font-semibold text-gray-900">Scoping Questions</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {introData.groups[0]?.description}
                    </p>
                    <div className="mt-4">
                      <IntroForm
                        introData={introData}
                        answers={introAnswers}
                        onChange={setIntroAnswers}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Activate Compliance Tracking
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                {/* ── Main content column ── */}
                <div className="min-w-0 flex-1 space-y-6">
                {/* ── State A: not yet activated ── */}
                {!active && (
                  <button
                    onClick={() => setShowActivationForm(true)}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Begin Compliance Self-Assessment
                  </button>
                )}


                {/* ── State C: active, no assessment, no history ── */}
                {active && !activeAssessment && !lastCompleted && (
                  <div className="space-y-4">
                    {showScopingForm ? (
                      <form onSubmit={handleStartAssessment} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-gray-900">Start Your First Self Assessment</h2>
                          <button
                            type="button"
                            onClick={() => { setShowScopingForm(false); setScopingAnswers({}); }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                        {introData && manifest?.hasIntroductionForm && (
                          <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-base font-semibold text-gray-900">Scoping Questions</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {introData.groups[0]?.description}
                            </p>
                            <div className="mt-4">
                              <IntroForm
                                introData={introData}
                                answers={scopingAnswers}
                                onChange={setScopingAnswers}
                              />
                            </div>
                          </div>
                        )}
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                          Start Assessment
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-6 text-center">
                        <p className="text-sm font-medium text-indigo-900">No assessments yet</p>
                        <p className="mt-1 text-xs text-indigo-700">
                          Complete a self assessment to track your compliance over time.
                        </p>
                        <button
                          onClick={() => setShowScopingForm(true)}
                          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                          Start your first Self Assessment
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── State D: active, no assessment, has history ── */}
                {active && !activeAssessment && lastCompleted && (
                  <div className="space-y-4">
                    {completedMessage && (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        Assessment completed and recorded.
                      </div>
                    )}
                    {showScopingForm ? (
                      <form onSubmit={handleStartAssessment} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-gray-900">New Self Assessment</h2>
                          <button
                            type="button"
                            onClick={() => { setShowScopingForm(false); setScopingAnswers({}); }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                        {introData && manifest?.hasIntroductionForm && (
                          <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-base font-semibold text-gray-900">Scoping Questions</h3>
                            <p className="mt-1 text-sm text-gray-600">
                              {introData.groups[0]?.description}
                            </p>
                            <div className="mt-4">
                              <IntroForm
                                introData={introData}
                                answers={scopingAnswers}
                                onChange={setScopingAnswers}
                              />
                            </div>
                          </div>
                        )}
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                          Start Assessment
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Last assessed: {formatDate(lastCompleted.completedAt!)}
                              {lastCompleted.completedBy && (
                                <span className="text-gray-500"> · {lastCompleted.completedBy}</span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {active.selfAssessments.filter((s) => s.status === "completed").length} assessment
                              {active.selfAssessments.filter((s) => s.status === "completed").length !== 1 ? "s" : ""} completed
                            </p>
                          </div>
                          <button
                            onClick={() => setShowScopingForm(true)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                          >
                            Start New Self Assessment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Compliance Forms — driven by manifest.processList */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Compliance Assessment</h2>
                    {active && (
                      <label className="flex cursor-pointer items-center gap-2.5 select-none">
                        <span className={`text-xs font-medium transition-colors ${filterActive ? "text-indigo-700" : "text-gray-400"}`}>
                          Relevant to me only
                        </span>
                        <button
                          role="switch"
                          aria-checked={filterActive}
                          onClick={() => setFilterActive((v) => !v)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                            filterActive ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              filterActive ? "translate-x-[18px]" : "translate-x-[3px]"
                            }`}
                          />
                        </button>
                      </label>
                    )}
                  </div>

                  {manifest?.processList && (() => {
                    const entries = manifest.processList;
                    const visibleEntries = (!active || !filterActive)
                      ? entries
                      : entries.filter((e) => isProcessUnlocked(e, currentIntroAnswers));

                    if (visibleEntries.length === 0) {
                      return (
                        <p className="text-sm text-gray-400">
                          No forms match your current scoping answers.
                        </p>
                      );
                    }

                    if (activeAssessment) {
                      // State B: assessment in progress — forms table wrapped inside assessment container
                      return (
                        <div className="overflow-hidden rounded-xl border border-indigo-200">
                          {/* Assessment header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                                Assessment in progress
                              </span>
                              <span className="text-xs text-indigo-700">
                                Started {formatDate(activeAssessment.startedAt)}
                              </span>
                            </div>
                            {allAssessmentComplete ? (
                              <button
                                onClick={handleCompleteAssessment}
                                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-500"
                              >
                                Complete Assessment
                              </button>
                            ) : (
                              <span className="text-xs text-indigo-600">
                                {incompleteCount} form{incompleteCount !== 1 ? "s" : ""} remaining
                              </span>
                            )}
                          </div>
                          {/* Forms table */}
                          <table className="w-full bg-white text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-left">
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Form</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Owner</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {visibleEntries.map((entry) => {
                                const formHref = `/dashboard/regulations/${id}/processes/${entry.id}`;
                                const ownerId = getRegulationProcessOwner(entry.id);
                                const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;
                                const completion = getEntryCompletion(entry);
                                const relevant = isProcessUnlocked(entry, currentIntroAnswers);
                                const notApplicable = !filterActive && !relevant;

                                return (
                                  <tr key={entry.id} className={`${notApplicable ? "opacity-50" : "hover:bg-gray-50"} transition-colors`}>
                                    <td className="px-4 py-3">
                                      {relevant ? (
                                        <Link href={formHref} className="font-medium text-gray-900 hover:text-indigo-600">
                                          {entry.title}
                                        </Link>
                                      ) : (
                                        <span className="font-medium text-gray-400">{entry.title}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {completion === "green" && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                          Complete
                                        </span>
                                      )}
                                      {completion === "in-progress" && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600">
                                          <span className="h-2 w-2 rounded-full bg-yellow-400" />
                                          In progress
                                        </span>
                                      )}
                                      {completion === "none" && (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                          <span className="h-2 w-2 rounded-full bg-gray-300" />
                                          Not started
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {owner ? (
                                        <span className="text-xs font-medium text-gray-700">{owner.name}</span>
                                      ) : (
                                        <button
                                          onClick={() => setAssignModal({ processId: entry.id, processName: entry.title })}
                                          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                          Assign owner
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    } else {
                      // States A, C, D: no active assessment — table with last completed info
                      return (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Form</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Last Completed</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Completed By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {visibleEntries.map((entry) => {
                                const relevant = !active || isProcessUnlocked(entry, currentIntroAnswers);
                                const notApplicable = active && !filterActive && !relevant;
                                const lastCompletion = getFormLastCompleted(entry.id);

                                return (
                                  <tr key={entry.id} className={notApplicable ? "opacity-50" : ""}>
                                    <td className="px-4 py-3">
                                      <span className={`font-medium ${notApplicable ? "text-gray-400" : "text-gray-900"}`}>
                                        {entry.title}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                      {lastCompletion ? formatDate(lastCompletion.completedAt!) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                      {lastCompletion?.completedBy ?? <span className="text-gray-300">—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  })()}

                  {assignModal && (
                    <AssignOwnerModal
                      processId={assignModal.processId}
                      processName={assignModal.processName}
                      isOpen
                      onClose={() => setAssignModal(null)}
                    />
                  )}
                </div>

                {/* Mermaid Flowchart — only shown if manifest provides diagram */}
                {manifest?.mermaidDiagram && (
                  <MermaidDiagram content={manifest.mermaidDiagram} />
                )}
                </div>{/* end main content column */}

                {/* ── Key dates sidebar — hidden when PDF panel is open ── */}
                {!pdfVisible && (
                  <div className="w-full shrink-0 lg:w-64">
                    <KeyDatesWidget regulationId={id} />
                  </div>
                )}
              </div>
              
            )}
            {/* end two-column layout */}
      </div>
    </>
  );
}

// ── Introduction / Scoping Form ──────────────────────────────────────────────
// Renders the buttonGroups from IntroductionData as toggle buttons.
// Produces answers like { "4_1_4_1": "Yes", "4_1_4_2": "Yes", "4_1_8": "Yes" }

type ButtonGroupDef = {
  label: string;
  multi: boolean;
  options: Array<{ key: string; label: string; controlId: string }>;
};

function IntroForm({
  introData,
  answers,
  onChange,
}: {
  introData: IntroductionData;
  answers: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}) {
  const buttonGroups = introData.buttonGroups as Record<string, ButtonGroupDef>;

  function toggle(controlId: string) {
    const next = { ...answers };
    if (next[controlId] === "Yes") {
      delete next[controlId];
    } else {
      next[controlId] = "Yes";
    }
    onChange(next);
  }

  return (
    <div className="space-y-6">
      {Object.entries(buttonGroups).map(([groupId, group]) => {
        const groupDef = introData.groups.find((g) => g.id === groupId);
        return (
          <div key={groupId} className="rounded-xl border border-gray-200 bg-white p-5">
            {groupDef && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {groupDef.title}
              </p>
            )}
            <p className="mb-3 text-sm font-medium text-gray-800">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const isActive = answers[opt.controlId] === "Yes";
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggle(opt.controlId)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
