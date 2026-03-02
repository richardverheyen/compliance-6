"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ProcessForm as ProcessFormData, ProcessControl } from "@/lib/types/process-form";
import { usePdfPanel } from "@/app/dashboard/regulations/[id]/_context";

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string>;
type Status = "pending" | "success" | "warning" | "error";

interface ProcessFormProps {
  form: ProcessFormData;
  initialAnswers: Answers;
  introAnswers: Answers;
  regulationId: string;
  sectionId: string;
  readOnly?: boolean;
  onAnswersChange: (answers: Answers) => void;
  onSave?: (answers: Answers) => void;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function checkVisibility(
  id: string,
  rules: ProcessFormData["rules"],
  answers: Answers,
  introAnswers: Answers,
): boolean {
  const showRules = rules.filter((r) => r.target === id && r.effect === "SHOW");
  if (showRules.length === 0) return true;
  return showRules.some((r) => {
    const val = introAnswers[r.scope] ?? answers[r.scope];
    return val === r.schema.const;
  });
}

function getChecklistStatus(ctrl: ProcessControl, answers: Answers): "pending" | "success" {
  const items = ctrl["checklist-items"] ?? [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === "or-group" && item.items) {
      if (item.items.some((_, j) => answers[`${ctrl.id}__ci_${i}_${j}`] === "true")) return "success";
    } else if (!("note" in item)) {
      if (answers[`${ctrl.id}__ci_${i}`] === "true") return "success";
    }
  }
  return "pending";
}

function getControlStatus(ctrl: ProcessControl, answers: Answers): Status {
  if (ctrl["checklist-items"]) return getChecklistStatus(ctrl, answers);
  return answers[ctrl.id] ? "success" : "pending";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubScopingPanel({ subScoping, answers, onToggle, readOnly }: {
  subScoping: NonNullable<ProcessFormData["sub_scoping"]>;
  answers: Answers;
  onToggle: (id: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="bg-white border border-blue-200 rounded-lg mb-3.5 overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200">
        <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
          Which sub-types apply to your organisation?
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Select all that apply — questions will be scoped to your selection.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {subScoping.map((sub) => {
          const selected = answers[sub.id] === "Yes";
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => !readOnly && onToggle(sub.id)}
              disabled={readOnly}
              className={`text-sm px-4 py-1.5 border-2 rounded font-medium transition-colors ${
                readOnly
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              } ${
                selected
                  ? "border-blue-500 bg-blue-100 text-blue-900"
                  : "border-blue-100 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SourceRulePill({ ruleCode }: { ruleCode: string }) {
  const { navigateToPdfDestination } = usePdfPanel();
  return (
    <button
      type="button"
      onClick={() => navigateToPdfDestination(ruleCode)}
      className="inline-flex items-center text-[0.6rem] bg-yellow-50 text-yellow-800 border border-yellow-200 px-1 py-0.5 rounded ml-0.5 hover:bg-yellow-100 hover:border-yellow-300 cursor-pointer transition-colors hidden lg:inline-flex"
      title={`Jump to rule ${ruleCode} in source PDF`}
    >
      {ruleCode}
    </button>
  );
}

function ControlRow({ ctrl, answers, rules, introAnswers, onAnswer, readOnly }: {
  ctrl: ProcessControl;
  answers: Answers;
  rules: ProcessFormData["rules"];
  introAnswers: Answers;
  onAnswer: (key: string, val: string) => void;
  readOnly?: boolean;
}) {
  const visible = checkVisibility(ctrl.id, rules, answers, introAnswers);
  const answer = answers[ctrl.id];

  if (!visible) return null;

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 last:border-b-0">
      {/* Main row */}
      <div className="flex flex-wrap items-start gap-2.5">
        {/* Label + source-rule codes */}
        <span className="flex-1 min-w-[200px] text-sm leading-snug">
          {ctrl.label}
          {(ctrl["source-rules"] ?? []).map((r) => (
            <SourceRulePill key={r} ruleCode={r} />
          ))}
        </span>

        {/* Yes / No radio buttons */}
        <div className="flex gap-1.5 shrink-0">
          {(["Yes", "No"] as const).map((val) => (
            <label
              key={val}
              onClick={(e) => {
                e.preventDefault(); // prevent browser scroll-to-focus on sr-only input
                if (!readOnly) onAnswer(ctrl.id, val);
              }}
              className={`text-sm px-3.5 py-1 border rounded transition-colors select-none ${
                readOnly ? "pointer-events-none opacity-70" : "cursor-pointer"
              } ${
                answer === val
                  ? val === "Yes"
                    ? "bg-green-100 border-green-500 text-green-900 font-medium"
                    : "bg-red-100 border-red-500 text-red-900 font-medium"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={ctrl.id}
                value={val}
                checked={answer === val}
                onChange={() => onAnswer(ctrl.id, val)}
                disabled={readOnly}
                className="sr-only"
              />
              {val}
            </label>
          ))}
        </div>
      </div>

      {/* Detail textarea (visible when answer is Yes) */}
      {ctrl["detail-required"] && answer === "Yes" && (
        <div className="mt-2 pl-8">
          <label className="block text-xs text-gray-500 mb-1">
            {ctrl["detail-label"] ?? "Please provide details:"}
          </label>
          <textarea
            value={answers[`${ctrl.id}_detail`] ?? ""}
            onChange={(e) => onAnswer(`${ctrl.id}_detail`, e.target.value)}
            placeholder="Enter details…"
            readOnly={readOnly}
            className={`w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm resize-y min-h-[60px] font-sans focus:outline-none focus:border-blue-400 ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
          />
        </div>
      )}
    </div>
  );
}

function ChecklistControl({ ctrl, answers, rules, introAnswers, onAnswer, readOnly }: {
  ctrl: ProcessControl;
  answers: Answers;
  rules: ProcessFormData["rules"];
  introAnswers: Answers;
  onAnswer: (key: string, val: string) => void;
  readOnly?: boolean;
}) {
  const visible = checkVisibility(ctrl.id, rules, answers, introAnswers);
  const items = ctrl["checklist-items"] ?? [];

  if (!visible) return null;

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 last:border-b-0">
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2.5">
        <span className="flex-1 text-sm leading-snug">
          {ctrl.label}
          {(ctrl["source-rules"] ?? []).map((r) => (
            <SourceRulePill key={r} ruleCode={r} />
          ))}
        </span>
      </div>

      {/* Checklist items */}
      <div className="pl-8 space-y-1">
        {items.map((item, i) => {
          if (item.type === "or-group" && item.items) {
            return (
              <div key={i} className="bg-green-50 border border-green-200 rounded-md p-2.5 my-1.5">
                {item.items.map((sub, j) => (
                  <div key={j}>
                    {j > 0 && (
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-green-200" />
                        <span className="text-[0.6rem] font-black uppercase tracking-widest text-green-600">or</span>
                        <div className="flex-1 h-px bg-green-200" />
                      </div>
                    )}
                    <label className={`flex items-center gap-2.5 ${readOnly ? "pointer-events-none" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={answers[`${ctrl.id}__ci_${i}_${j}`] === "true"}
                        onChange={(e) => onAnswer(`${ctrl.id}__ci_${i}_${j}`, e.target.checked ? "true" : "false")}
                        disabled={readOnly}
                        className="w-3.5 h-3.5 rounded accent-green-600 cursor-pointer shrink-0"
                      />
                      <span className="text-sm">{sub.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            );
          }
          return (
            <label key={i} className={`flex items-start gap-2.5 py-1 border-b border-slate-50 last:border-b-0 ${readOnly ? "pointer-events-none" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={answers[`${ctrl.id}__ci_${i}`] === "true"}
                onChange={(e) => onAnswer(`${ctrl.id}__ci_${i}`, e.target.checked ? "true" : "false")}
                disabled={readOnly}
                className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer shrink-0 mt-0.5"
              />
              <span className="text-sm leading-snug">{item.label}</span>
            </label>
          );
        })}

        {/* Other free-text */}
        <div className="pt-2 mt-1 border-t border-dashed border-gray-200">
          <label className="block text-xs text-gray-400 mb-1">Other:</label>
          <textarea
            value={answers[`${ctrl.id}__other`] ?? ""}
            onChange={(e) => onAnswer(`${ctrl.id}__other`, e.target.value)}
            placeholder="Add any additional items your procedure covers…"
            readOnly={readOnly}
            className={`w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm resize-y min-h-[34px] font-sans focus:outline-none focus:border-blue-400 ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}

function FormLinkBlock({ link, answers, introAnswers, regulationId, readOnly }: {
  link: NonNullable<ProcessFormData["form_links"]>[number];
  answers: Answers;
  introAnswers: Answers;
  regulationId: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [linkedForm, setLinkedForm] = useState<ProcessFormData | null>(null);
  const [linkedAnswers, setLinkedAnswers] = useState<Answers>({});

  const isVisible = !link.gated_by || answers[link.gated_by] === "Yes";
  if (!isVisible) return null;

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !linkedForm) {
      try {
        const res = await fetch(
          `/api/compliance/regulations/${regulationId}/processes/${link.target}/schema`,
        );
        if (res.ok) {
          const data = await res.json();
          setLinkedForm({
            controls: data.fields ?? [],
            groups: data.groups ?? [],
            rules: data.rules ?? [],
            sub_scoping: data.sub_scoping ?? [],
            form_links: data.form_links ?? [],
          } as unknown as ProcessFormData);
        }
      } catch {
        // form not found
      }
    }
  }

  return (
    <div className="ml-8 mb-3.5 border border-l-4 border-green-200 border-l-green-500 rounded-r-lg overflow-hidden bg-green-50">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 border-b border-green-100 text-left transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
          <span>🔗</span>
          {link.label}
          <span className="text-[0.65rem] bg-green-100 text-green-900 px-1.5 py-0.5 rounded-full font-bold border border-green-200">
            {link.target}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/regulations/${regulationId}/processes/${link.target}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-green-700 hover:text-green-900 underline"
          >
            Open process
          </Link>
          <svg
            className={`w-3 h-3 text-green-600 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="p-2.5">
          {!linkedForm ? (
            <p className="text-sm text-gray-400 px-2 py-3">Could not load {link.target}.</p>
          ) : (
            linkedForm.groups.map((group) => {
              const groupControls = linkedForm.controls.filter((c) => c.group === group.id);
              if (groupControls.length === 0) return null;
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  controls={groupControls}
                  rules={linkedForm.rules}
                  answers={linkedAnswers}
                  introAnswers={introAnswers}
                  formLinks={[]}
                  onAnswer={(k, v) => setLinkedAnswers((prev) => ({ ...prev, [k]: v }))}
                  regulationId={regulationId}
                  readOnly={readOnly}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, controls, rules, answers, introAnswers, formLinks, onAnswer, regulationId, readOnly }: {
  group: ProcessFormData["groups"][number];
  controls: ProcessControl[];
  rules: ProcessFormData["rules"];
  answers: Answers;
  introAnswers: Answers;
  formLinks: NonNullable<ProcessFormData["form_links"]>;
  onAnswer: (k: string, v: string) => void;
  regulationId: string;
  readOnly?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const visible = checkVisibility(group.id, rules, answers, introAnswers);
  const anyControlVisible = controls.some((c) => checkVisibility(c.id, rules, answers, introAnswers));

  if (!visible || (controls.length > 0 && !anyControlVisible)) return null;

  const isSubprocess = group.variant === "subprocess";

  return (
    <div className={`bg-white border border-gray-200 rounded-lg mb-3.5 overflow-hidden ${
      isSubprocess ? "ml-5 border-l-4 border-l-purple-500 rounded-l-none" : ""
    }`}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-200 text-left transition-colors select-none ${
          isSubprocess ? "bg-purple-50 hover:bg-purple-100" : "bg-slate-50 hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-2.5 h-2.5 text-gray-400 transition-transform shrink-0 ${collapsed ? "" : "rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-[0.95rem]">{group.title}</span>
          {isSubprocess && (
            <span className="text-[0.6rem] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
              Sub-process
            </span>
          )}
        </div>
      </button>

      {!collapsed && (
        <div>
          {group.description && (
            <div className="px-4 py-2.5 text-sm text-gray-500 bg-[#fafbfc] border-b border-gray-100">
              {group.description}
            </div>
          )}
          {controls
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
            .map((ctrl) => {
              const el = ctrl["checklist-items"] ? (
                <ChecklistControl
                  key={ctrl.id}
                  ctrl={ctrl}
                  answers={answers}
                  rules={rules}
                  introAnswers={introAnswers}
                  onAnswer={onAnswer}
                  readOnly={readOnly}
                />
              ) : (
                <ControlRow
                  key={ctrl.id}
                  ctrl={ctrl}
                  answers={answers}
                  rules={rules}
                  introAnswers={introAnswers}
                  onAnswer={onAnswer}
                  readOnly={readOnly}
                />
              );
              // Render form-link blocks gated by this control inline after it
              const gatedLinks = formLinks.filter((fl) => fl.gated_by === ctrl.id);
              return (
                <div key={ctrl.id}>
                  {el}
                  {gatedLinks.map((fl) => (
                    <FormLinkBlock
                      key={fl.target}
                      link={fl}
                      answers={answers}
                      introAnswers={introAnswers}
                      regulationId={regulationId}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─── Main ProcessForm component ───────────────────────────────────────────────

export function ProcessForm({
  form,
  initialAnswers,
  introAnswers,
  regulationId,
  sectionId,
  readOnly,
  onAnswersChange,
  onSave,
}: ProcessFormProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial answers when section changes
  useEffect(() => {
    setAnswers(initialAnswers);
  }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((key: string, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: val };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onAnswersChange(next), 500);
      return next;
    });
  }, [onAnswersChange]);

  function handleSubTypeToggle(id: string) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: prev[id] === "Yes" ? "" : "Yes" };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onAnswersChange(next), 500);
      return next;
    });
  }

  const subScoping = form.sub_scoping ?? [];
  const hasSubScoping = subScoping.length > 0;
  const anySubSelected = hasSubScoping && subScoping.some((s) => answers[s.id] === "Yes");
  const formLinks = form.form_links ?? [];

  // Existence gate
  const hasExistenceQuestion = form.controls.some((c) => c.id === "process-exists");
  const processExists = !hasExistenceQuestion || answers["process-exists"] === "Yes";
  const processDeclinedExistence = hasExistenceQuestion && answers["process-exists"] === "No";

  // Split groups
  const existenceGroup = form.groups.find((g) => g.id === "process-existence");
  const mainGroups = form.groups.filter((g) => g.id !== "process-existence");

  // Build group → controls map (explicit group field, not prefix matching)
  const controlsByGroup: Record<string, ProcessControl[]> = {};
  form.groups.forEach((g) => { controlsByGroup[g.id] = []; });
  const ungrouped: ProcessControl[] = [];
  form.controls.forEach((c) => {
    if (c.group && controlsByGroup[c.group] !== undefined) {
      controlsByGroup[c.group].push(c);
    } else {
      ungrouped.push(c);
    }
  });

  // Overall form progress: count visible controls with any answer
  // When process doesn't exist, only the existence control counts
  let totalControls = 0;
  let answeredControls = 0;
  const controlsToCount = processExists ? form.controls : form.controls.filter((c) => c.id === "process-exists");
  controlsToCount.forEach((ctrl) => {
    if (!checkVisibility(ctrl.id, form.rules, answers, introAnswers)) return;
    totalControls++;
    if (getControlStatus(ctrl, answers) === "success") answeredControls++;
  });
  const progressPct = totalControls === 0 ? 0 : Math.round((answeredControls / totalControls) * 100);
  const allAnswered = totalControls > 0 && answeredControls === totalControls;

  return (
    <div>
      {/* Read-only banner */}
      {readOnly && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Read-only — no assessment in progress. Answers cannot be changed.
        </div>
      )}

      {/* Existence gate group — always shown when present */}
      {existenceGroup && (
        <GroupCard
          key={existenceGroup.id}
          group={existenceGroup}
          controls={controlsByGroup[existenceGroup.id] ?? []}
          rules={form.rules}
          answers={answers}
          introAnswers={introAnswers}
          formLinks={[]}
          onAnswer={handleAnswer}
          regulationId={regulationId}
          readOnly={readOnly}
        />
      )}

      {/* "No" banner */}
      {processDeclinedExistence && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          This process is not active for your organisation. No further questions are required.
        </div>
      )}

      {/* Main content — only shown when processExists */}
      {processExists && (
        <>
          {/* Sub-scoping panel */}
          {hasSubScoping && (
            <SubScopingPanel
              subScoping={subScoping}
              answers={answers}
              onToggle={handleSubTypeToggle}
              readOnly={readOnly}
            />
          )}

          {/* Gate prompt */}
          {hasSubScoping && !anySubSelected ? (
            <div className="text-center py-12 px-6 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/40 mt-2">
              <span className="block text-2xl mb-2 text-blue-200">↑</span>
              <p className="text-sm text-gray-500 leading-relaxed">
                Select one or more sub-types above to view the relevant compliance questions.
              </p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              {totalControls > 0 && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{answeredControls} of {totalControls} questions answered</span>
                    <span className={`font-semibold ${allAnswered ? "text-green-600" : "text-indigo-600"}`}>
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${allAnswered ? "bg-green-500" : "bg-indigo-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Main groups (excluding existence group) */}
              {mainGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  controls={controlsByGroup[group.id] ?? []}
                  rules={form.rules}
                  answers={answers}
                  introAnswers={introAnswers}
                  formLinks={formLinks}
                  onAnswer={handleAnswer}
                  regulationId={regulationId}
                  readOnly={readOnly}
                />
              ))}

              {/* Ungrouped controls */}
              {ungrouped.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg mb-3.5 overflow-hidden">
                  <div className="px-4 py-3 font-semibold text-sm border-b border-gray-200 bg-slate-50">
                    Other Controls
                  </div>
                  {ungrouped.map((ctrl) =>
                    ctrl["checklist-items"] ? (
                      <ChecklistControl key={ctrl.id} ctrl={ctrl} answers={answers} rules={form.rules} introAnswers={introAnswers} onAnswer={handleAnswer} readOnly={readOnly} />
                    ) : (
                      <ControlRow key={ctrl.id} ctrl={ctrl} answers={answers} rules={form.rules} introAnswers={introAnswers} onAnswer={handleAnswer} readOnly={readOnly} />
                    )
                  )}
                </div>
              )}

              {/* Form links not tied to a specific control */}
              {formLinks
                .filter((fl) => !fl.gated_by || !form.controls.find((c) => c.id === fl.gated_by))
                .map((fl) => (
                  <FormLinkBlock
                    key={fl.target}
                    link={fl}
                    answers={answers}
                    introAnswers={introAnswers}
                    regulationId={regulationId}
                    readOnly={readOnly}
                  />
                ))}
            </>
          )}
        </>
      )}

      {/* Save button — hidden when read-only */}
      {!readOnly && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onSave ? onSave(answers) : onAnswersChange(answers)}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Save & Return
          </button>
        </div>
      )}
    </div>
  );
}
