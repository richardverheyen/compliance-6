"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import type { Regulation } from "@/lib/types/compliance";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";
import MermaidDiagram from "@/components/compliance/MermaidDiagram";
import type { IntroductionData, RegulationManifest, ProcessListEntry } from "@/lib/types/regulation-content";

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


export default function RegulationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    regulations,
    fetchRegulations,
    getActiveRegulation,
    activateRegulation,
    getRegulationProcessOwner,
    getTeamMembersWithAuth,
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

  if (!regulation || contentLoading) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
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

  const activeIntroAnswers = active?.sectionAnswers["risk-assessment"] ?? {};

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/regulations"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Regulations
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {regulation.name}
        </h1>
        <div className="mt-2 flex gap-3">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {regulation.agency}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {regulation.jurisdiction}
          </span>
        </div>
        <p className="mt-4 text-gray-600">{regulation.description}</p>

        {/* 2-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
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
              <>
                {/* CTA or active status */}
                {!active ? (
                  <button
                    onClick={() => setShowActivationForm(true)}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Begin Compliance Self-Assessment
                  </button>
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-green-800">Compliance tracking is active</p>
                      <Link
                        href="/dashboard"
                        className="text-sm font-medium text-green-700 underline hover:text-green-600"
                      >
                        View Dashboard
                      </Link>
                    </div>
                  </div>
                )}

                {/* Compliance Forms — driven by manifest.processList */}
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Compliance Forms</h2>
                    {active && (
                      <button
                        onClick={() => setFilterActive((v) => !v)}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          filterActive
                            ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${filterActive ? "bg-indigo-500" : "bg-gray-300"}`} />
                        {filterActive ? "Filtered to your business" : "Show all"}
                      </button>
                    )}
                  </div>

                  {manifest?.processList && (() => {
                    const entries = manifest.processList;
                    const visibleEntries = (!active || !filterActive)
                      ? entries
                      : entries.filter((e) => isProcessUnlocked(e, activeIntroAnswers));

                    if (visibleEntries.length === 0) {
                      return (
                        <p className="text-sm text-gray-400">
                          No forms match your current scoping answers.
                        </p>
                      );
                    }

                    return visibleEntries.map((entry) => {
                      const formHref = `/dashboard/regulations/${id}/processes/${entry.id}`;
                      const ownerId = active ? getRegulationProcessOwner(entry.id) : undefined;
                      const owner = ownerId ? getTeamMembersWithAuth().find((m) => m.id === ownerId) : undefined;

                      return (
                        <div key={entry.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          {active ? (
                            <Link href={formHref} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{entry.title}</h3>
                                {entry.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{entry.description}</p>
                                )}
                              </div>
                              <div className="shrink-0 pt-0.5">
                                {owner ? (
                                  <span className="text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">{owner.name}</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAssignModal({ processId: entry.id, processName: entry.title }); }}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                  >
                                    Assign owner
                                  </button>
                                )}
                              </div>
                            </Link>
                          ) : (
                            <div className="flex items-start gap-3 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-gray-900">{entry.title}</h3>
                                {entry.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{entry.description}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
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

              </>
            )}
          </div>

          {/* Right column — regulation source PDF (only if manifest provides a URL) */}
          {manifest?.pdfUrl && (
            <div className="hidden lg:block">
              <div className="sticky top-8">
                <p className="mb-2 text-xs font-medium text-gray-500">Regulation Source Document</p>
                <iframe
                  src={manifest.pdfUrl}
                  title="Regulation Source Document"
                  className="h-[calc(100vh-6rem)] w-full rounded-xl border border-gray-200 bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
