"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { usePdfPanel } from "../../../../../_context";
import type { ProcessControl, ProcessForm as ProcessFormData } from "@/lib/types/process-form";
import type { RegulationManifest } from "@/lib/types/regulation-content";
import { computeProcessScore, getScoreColor, type ControlScore } from "@/lib/process-score";

// ── Source rule pill — clicks open the PDF at that rule ───────────────────────
function SourceRulePill({ ruleCode }: { ruleCode: string }) {
  const { navigateToPdfDestination } = usePdfPanel();
  return (
    <button
      type="button"
      onClick={() => navigateToPdfDestination(ruleCode)}
      className="inline-flex items-center text-[0.6rem] bg-yellow-50 text-yellow-800 border border-yellow-200 px-1 py-0.5 rounded ml-0.5 hover:bg-yellow-100 hover:border-yellow-300 cursor-pointer transition-colors"
      title={`Jump to rule ${ruleCode} in source PDF`}
    >
      {ruleCode}
    </button>
  );
}

// ── Remediation text — parses rule code references into clickable pills ────────
// Matches patterns like 4.2.3, 4.2.3(1), 4.2.6(2)(a)
// Trailing \b is intentionally omitted — rule codes ending with ) have no word boundary after them.
const RULE_CODE_RE = /\b(\d+\.\d+(?:\.\d+)?(?:\([^)]+\))*)/g;

function RemediationText({ text }: { text: string }) {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  RULE_CODE_RE.lastIndex = 0;
  while ((match = RULE_CODE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<SourceRulePill key={match.index} ruleCode={match[1]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <p className="leading-relaxed text-gray-700">{parts}</p>;
}

// ── Checklist answer — shows each item's actual checked state ─────────────────
function ChecklistAnswer({
  ctrl,
  answers,
}: {
  ctrl: ProcessControl;
  answers: Record<string, string>;
}) {
  const items = ctrl["checklist-items"] ?? [];
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        if (item.type === "or-group" && item.items) {
          const anyChecked = item.items.some((_, j) => answers[`${ctrl.id}__ci_${i}_${j}`] === "true");
          return (
            <div key={i} className={`rounded border px-2 py-1.5 ${anyChecked ? "border-green-100 bg-green-50/60" : "border-red-100 bg-red-50/40"}`}>
              <p className={`mb-1 text-[0.6rem] font-bold uppercase tracking-wider ${anyChecked ? "text-green-700" : "text-red-600"}`}>
                Any one of:
              </p>
              {item.items.map((sub, j) => {
                const checked = answers[`${ctrl.id}__ci_${i}_${j}`] === "true";
                return (
                  <div key={j} className="flex items-start gap-1.5 py-0.5">
                    <span className={`mt-0.5 shrink-0 text-[0.65rem] font-bold ${checked ? "text-green-600" : "text-gray-300"}`}>
                      {checked ? "✓" : "○"}
                    </span>
                    <span className={`text-xs leading-snug ${checked ? "text-gray-800" : "text-gray-400"}`}>{sub.label}</span>
                  </div>
                );
              })}
            </div>
          );
        }
        if (!item.label || ("note" in (item as object))) return null;
        const checked = answers[`${ctrl.id}__ci_${i}`] === "true";
        return (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <span className={`mt-0.5 shrink-0 text-[0.65rem] font-bold ${checked ? "text-green-600" : "text-red-400"}`}>
              {checked ? "✓" : "✗"}
            </span>
            <span className={`text-xs leading-snug ${checked ? "text-gray-700" : "text-gray-500"}`}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Checklist expected — shows the full list of required items as the target state ─
function ChecklistExpected({ ctrl }: { ctrl: ProcessControl }) {
  const items = ctrl["checklist-items"] ?? [];
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        if (item.type === "or-group" && item.items) {
          return (
            <div key={i} className="rounded border border-green-100 bg-green-50/60 px-2 py-1.5">
              <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-wider text-green-700">Any one of:</p>
              {item.items.map((sub, j) => (
                <div key={j} className="flex items-start gap-1.5 py-0.5">
                  <span className="mt-0.5 shrink-0 text-[0.65rem] font-bold text-green-500">✓</span>
                  <span className="text-xs leading-snug text-gray-600">{sub.label}</span>
                </div>
              ))}
            </div>
          );
        }
        if (!item.label || ("note" in (item as object))) return null;
        return (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <span className="mt-0.5 shrink-0 text-[0.65rem] font-bold text-green-500">✓</span>
            <span className="text-xs leading-snug text-gray-600">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ correct, total, pct }: { correct: number; total: number; pct: number }) {
  const nonCompliant = total - correct;
  const color = getScoreColor(pct);
  const cls =
    color === "green"
      ? "bg-green-100 text-green-800 border-green-200"
      : color === "amber"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-800 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>
      Based on your self-assessment,{" "}
      <span>{nonCompliant}/{total} are likely non-compliant</span>
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RemediationPage() {
  const params = useParams();
  const regulationId = params.id as string;
  const assessmentId = params.assessmentId as string;
  const processId = params.processId as string;

  const { pdfVisible, togglePdf, pdfUrl } = usePdfPanel();
  const { regulations, getActiveRegulation, getAssessmentById } = useComplianceStore();

  const [manifest, setManifest] = useState<RegulationManifest | null>(null);
  const [form, setForm] = useState<ProcessFormData | null>(null);
  const [loading, setLoading] = useState(true);

  const regulation = regulations.find((r) => r.id === regulationId);
  const active = getActiveRegulation(regulationId);
  const assessment = getAssessmentById(regulationId, assessmentId);

  const answers = assessment?.sectionAnswers[processId] ?? {};
  const introAnswers = assessment?.sectionAnswers["__scoping__"] ?? {};

  useEffect(() => {
    Promise.all([
      fetch(`/api/compliance/regulations/${regulationId}/manifest`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/compliance/regulations/${regulationId}/processes/${processId}/schema`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([mf, data]) => {
      setManifest(mf);
      if (data) {
        setForm({
          controls: data.fields ?? [],
          groups: data.groups ?? [],
          rules: data.rules ?? [],
          sub_scoping: data.sub_scoping ?? [],
          form_links: data.form_links ?? [],
        } as unknown as ProcessFormData);
      }
      setLoading(false);
    });
  }, [regulationId, processId]);

  const currentProcess = manifest?.processList.find((p) => p.id === processId);

  const assessmentNumber = assessment
    ? [...(active?.selfAssessments ?? [])]
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
        .findIndex((a) => a.id === assessmentId) + 1
    : 0;

  const baseHref = `/dashboard/regulations/${regulationId}/assessments/${assessmentId}/processes`;

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (!assessment) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-gray-500">Assessment not found.</p>
        <Link
          href={`/dashboard/regulations/${regulationId}`}
          className="mt-2 block text-sm text-indigo-600 hover:text-indigo-500"
        >
          ← Back to {regulation?.shortName ?? regulationId}
        </Link>
      </div>
    );
  }

  // Compute score and collect incorrect controls
  const controls = form?.controls ?? [];
  const rules = form?.rules ?? [];
  const groups = form?.groups ?? [];

  const { correct, total, pct, controlScores } = computeProcessScore(controls, rules, answers, introAnswers);

  const incorrectScores = controlScores.filter((cs) => !cs.isCorrect);

  // Group incorrect controls by their group ID, preserving group order
  const groupedIssues = new Map<string, ControlScore[]>();
  for (const cs of incorrectScores) {
    const g = cs.ctrl.group;
    if (!groupedIssues.has(g)) groupedIssues.set(g, []);
    groupedIssues.get(g)!.push(cs);
  }
  const orderedGroups = groups.filter((g) => groupedIssues.has(g.id));

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb + PDF toggle */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard/regulations" className="text-indigo-600 hover:text-indigo-500">
            Regulations
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/regulations/${regulationId}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            {regulation?.shortName ?? regulationId}
          </Link>
          <span>/</span>
          <Link
            href={`${baseHref}/${processId}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Assessment #{assessmentNumber} · {currentProcess?.title ?? processId}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Remediation</span>
        </nav>

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

      {/* Heading */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remediation Feedback</h1>
          <p className="mt-1 text-sm text-gray-600">{currentProcess?.title ?? processId}</p>
        </div>
        <ScoreBadge correct={correct} total={total} pct={pct} />
      </div>

      {/* Intro text */}
      <p className="mt-3 text-sm text-gray-500">
        The table below lists all compliance controls where your answer did not match the expected answer.
        Click any rule code pill to jump to the relevant section in the regulation document.
      </p>

      {/* All-correct state */}
      {incorrectScores.length === 0 && (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
          <svg className="mx-auto h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-base font-semibold text-green-800">All controls answered correctly</p>
          <p className="mt-1 text-sm text-green-700">No remediation actions are required for this process.</p>
        </div>
      )}

      {/* Remediation table */}
      {incorrectScores.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-[30%]">Question</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-[10%]">Answer</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-[10%]">Expected</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600">Remediation Guidance</th>
              </tr>
            </thead>
            <tbody>
              {orderedGroups.map((group) => {
                const issues = groupedIssues.get(group.id) ?? [];
                const isSubprocess = group.variant === "subprocess";
                return (
                  <React.Fragment key={`group-${group.id}`}>
                    {/* Group header row */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td
                        colSpan={4}
                        className={`px-4 py-2.5 ${isSubprocess ? "pl-8" : ""}`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          {group.title}
                        </span>
                        {isSubprocess && (
                          <span className="ml-2 rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-indigo-600">
                            subprocess
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* One row per incorrect control in this group */}
                    {issues.map(({ ctrl, answer }) => {
                      const sourceRules = ctrl["source-rules"] ?? [];
                      const isChecklist = !!ctrl["checklist-items"];
                      const answerLabel = answer ?? "—";
                      const expectedLabel = ctrl["correct-option"];
                      const isUnanswered = !answer && !isChecklist;

                      return (
                        <tr
                          key={ctrl.id}
                          className={`border-t border-gray-100 align-top ${isSubprocess ? "bg-indigo-50/20" : "bg-white"} hover:bg-gray-50 transition-colors`}
                        >
                          {/* Question */}
                          <td className={`px-4 py-4 ${isSubprocess ? "pl-8" : ""}`}>
                            <p className="leading-snug text-gray-800">{ctrl.label}</p>
                            {sourceRules.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-0.5">
                                {sourceRules.map((r) => (
                                  <SourceRulePill key={r} ruleCode={r} />
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Your answer */}
                          <td className="px-4 py-4">
                            {isChecklist ? (
                              <ChecklistAnswer ctrl={ctrl} answers={answers} />
                            ) : (
                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                  isUnanswered
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {answerLabel}
                              </span>
                            )}
                          </td>

                          {/* Expected */}
                          <td className="px-4 py-4">
                            {isChecklist ? (
                              <ChecklistExpected ctrl={ctrl} />
                            ) : (
                              <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                {expectedLabel}
                              </span>
                            )}
                          </td>

                          {/* Remediation */}
                          <td className="px-4 py-4">
                            {ctrl.remediation ? (
                              <RemediationText text={ctrl.remediation} />
                            ) : (
                              <p className="text-gray-400 italic">No remediation guidance available.</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 border-t border-gray-200 pt-4">
        <Link
          href={`${baseHref}/${processId}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Back to {currentProcess?.title ?? processId}
        </Link>
      </div>
    </div>
  );
}
