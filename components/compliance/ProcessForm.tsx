"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ProcessForm as ProcessFormData, ProcessControl, FeedbackData, ControlNote } from "@/lib/types/process-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type Answers = Record<string, string>;
type Status = "pending" | "success" | "warning" | "error";

interface ProcessFormProps {
  form: ProcessFormData;
  feedback?: FeedbackData;
  initialAnswers: Answers;
  introAnswers: Answers;
  regulationId: string;
  sectionId: string;
  /** formId used as the key for feedback API calls (defaults to sectionId) */
  formId?: string;
  onAnswersChange: (answers: Answers) => void;
}

interface CommentPopoverState {
  ruleCode: string;
  x: number;
  y: number;
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
      const anyChecked = item.items.some((_, j) => answers[`${ctrl.id}__ci_${i}_${j}`] === "true");
      if (!anyChecked) return "pending";
    } else if (!("note" in item)) {
      if (answers[`${ctrl.id}__ci_${i}`] !== "true") return "pending";
    }
  }
  return "success";
}

function getControlStatus(ctrl: ProcessControl, answers: Answers): Status {
  if (ctrl["checklist-items"]) return getChecklistStatus(ctrl, answers);
  const answer = answers[ctrl.id];
  const detail = answers[`${ctrl.id}_detail`];
  if (!answer) return "pending";
  if (!ctrl["correct-option"] || ctrl["correct-option"] === "N/A") return "success";
  if (answer !== ctrl["correct-option"]) return "error";
  if (ctrl["detail-required"] && (!detail || !detail.trim())) return "warning";
  return "success";
}

function getGroupScore(
  groupId: string,
  controls: ProcessControl[],
  rules: ProcessFormData["rules"],
  answers: Answers,
  introAnswers: Answers,
) {
  const groupControls = controls.filter((c) => c.group === groupId);
  let total = 0, green = 0;
  groupControls.forEach((c) => {
    if (!checkVisibility(c.id, rules, answers, introAnswers)) return;
    total++;
    if (getControlStatus(c, answers) === "success") green++;
  });
  return { score: total === 0 ? 1 : green / total, total, green };
}

const STATUS_DOT_COLOR: Record<Status, string> = {
  pending: "bg-orange-400",
  success: "bg-green-500",
  warning: "bg-yellow-400",
  error:   "bg-red-500",
};

function scoreClasses(score: number, total: number) {
  if (total === 0) return "text-gray-400 bg-gray-100";
  if (score >= 1)  return "text-green-700 bg-green-50";
  if (score >= 0.5) return "text-yellow-700 bg-yellow-50";
  return "text-orange-700 bg-orange-50";
}

// ─── Pill helpers ─────────────────────────────────────────────────────────────

const SEV_PILL: Record<ControlNote["severity"], string> = {
  approved: "ring-1 ring-green-300 text-green-700",
  info:     "ring-1 ring-gray-300 text-gray-500",
  warning:  "ring-1 ring-yellow-300 text-yellow-700",
  error:    "ring-1 ring-red-300 text-red-700",
};

function pillDot(severity: ControlNote["severity"]) {
  const colors = { approved: "bg-green-500", info: "bg-gray-400", warning: "bg-yellow-400", error: "bg-red-500" };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[severity]} ml-px`} />;
}

const CORRECT_CLS = { Yes: "bg-green-100 text-green-800", No: "bg-red-100 text-red-800", "N/A": "bg-gray-100 text-gray-600" };
const CONF_CLS = (c: number) => c >= 0.7 ? "bg-green-100 text-green-800" : c >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsBar({ form, answers, rules, introAnswers }: {
  form: ProcessFormData;
  answers: Answers;
  rules: ProcessFormData["rules"];
  introAnswers: Answers;
}) {
  const visible = form.controls.filter((c) => checkVisibility(c.id, rules, answers, introAnswers));
  const answered = visible.filter((c) => answers[c.id]);
  const compliant = visible.filter((c) => getControlStatus(c, answers) === "success");
  return (
    <div className="flex gap-3 mb-4 text-sm text-gray-500">
      {[
        { val: visible.length, label: "visible controls" },
        { val: answered.length, label: "answered" },
        { val: compliant.length, label: "compliant" },
      ].map(({ val, label }) => (
        <div key={label} className="bg-white border border-gray-200 rounded px-3 py-1.5">
          <strong className="text-gray-900">{val}</strong> {label}
        </div>
      ))}
    </div>
  );
}

function SubScopingPanel({ subScoping, answers, onToggle }: {
  subScoping: NonNullable<ProcessFormData["sub_scoping"]>;
  answers: Answers;
  onToggle: (id: string) => void;
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
              onClick={() => onToggle(sub.id)}
              className={`text-sm px-4 py-1.5 border-2 rounded font-medium transition-colors ${
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

function SourceRulePill({ ruleCode, controlNotes, onClick }: {
  ruleCode: string;
  controlNotes: Record<string, ControlNote>;
  onClick: (ruleCode: string, rect: DOMRect) => void;
}) {
  const note = controlNotes[ruleCode];
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      onClick={() => ref.current && onClick(ruleCode, ref.current.getBoundingClientRect())}
      className={`inline-flex items-center gap-0.5 text-[0.6rem] bg-yellow-50 text-yellow-800 border border-yellow-200 px-1 py-0.5 rounded ml-0.5 cursor-pointer hover:opacity-75 transition-opacity ${note ? SEV_PILL[note.severity] : ""}`}
    >
      {ruleCode}
      {note && pillDot(note.severity)}
    </span>
  );
}

function ControlRow({ ctrl, answers, rules, introAnswers, controlNotes, onAnswer, onPillClick }: {
  ctrl: ProcessControl;
  answers: Answers;
  rules: ProcessFormData["rules"];
  introAnswers: Answers;
  controlNotes: Record<string, ControlNote>;
  onAnswer: (key: string, val: string) => void;
  onPillClick: (ruleCode: string, rect: DOMRect) => void;
}) {
  const visible = checkVisibility(ctrl.id, rules, answers, introAnswers);
  const status = getControlStatus(ctrl, answers);
  const answer = answers[ctrl.id];
  const co = ctrl["correct-option"] as keyof typeof CORRECT_CLS;
  const conf = ctrl["mapping-confidence"];

  if (!visible) return null;

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 last:border-b-0">
      {/* Main row */}
      <div className="flex flex-wrap items-start gap-2.5">
        {/* Status dot */}
        <span className={`w-3 h-3 rounded-full border border-black/10 shrink-0 mt-1 ${STATUS_DOT_COLOR[status]}`} />

        {/* ID badge */}
        <span className="text-[0.7rem] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0">
          {ctrl.id}
        </span>

        {/* Label + metadata tags */}
        <span className="flex-1 min-w-[200px] text-sm leading-snug">
          {ctrl.label}
          {ctrl["process-id"] && (
            <span className="inline text-[0.65rem] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1.5">
              {ctrl["process-id"]}
            </span>
          )}
          {co && (
            <span className={`inline text-[0.62rem] px-1 py-0.5 rounded ml-1 ${CORRECT_CLS[co] ?? "bg-gray-100 text-gray-600"}`}>
              expects {co}
            </span>
          )}
          {conf !== undefined && conf !== null && (
            <span className={`inline text-[0.6rem] font-semibold px-1 py-0.5 rounded ml-1 ${CONF_CLS(conf)}`}>
              {Math.round(conf * 100)}%
            </span>
          )}
          {(ctrl["source-rules"] ?? []).map((r) => (
            <SourceRulePill key={r} ruleCode={r} controlNotes={controlNotes} onClick={onPillClick} />
          ))}
        </span>

        {/* Yes / No radio buttons */}
        <div className="flex gap-1.5 shrink-0">
          {(["Yes", "No"] as const).map((val) => (
            <label
              key={val}
              className={`text-sm px-3.5 py-1 border rounded cursor-pointer transition-colors select-none ${
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
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm resize-y min-h-[60px] font-sans focus:outline-none focus:border-blue-400"
          />
        </div>
      )}
    </div>
  );
}

function ChecklistControl({ ctrl, answers, rules, introAnswers, controlNotes, onAnswer, onPillClick }: {
  ctrl: ProcessControl;
  answers: Answers;
  rules: ProcessFormData["rules"];
  introAnswers: Answers;
  controlNotes: Record<string, ControlNote>;
  onAnswer: (key: string, val: string) => void;
  onPillClick: (ruleCode: string, rect: DOMRect) => void;
}) {
  const visible = checkVisibility(ctrl.id, rules, answers, introAnswers);
  const status = getChecklistStatus(ctrl, answers);
  const items = ctrl["checklist-items"] ?? [];
  const conf = ctrl["mapping-confidence"];

  if (!visible) return null;

  return (
    <div className="px-4 py-3.5 border-b border-slate-100 last:border-b-0">
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2.5">
        <span className={`w-3 h-3 rounded-full border border-black/10 shrink-0 mt-1 ${STATUS_DOT_COLOR[status]}`} />
        <span className="text-[0.7rem] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0">
          {ctrl.id}
        </span>
        <span className="flex-1 text-sm leading-snug">
          {ctrl.label}
          {ctrl["process-id"] && (
            <span className="inline text-[0.65rem] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1.5">
              {ctrl["process-id"]}
            </span>
          )}
          {conf !== undefined && conf !== null && (
            <span className={`inline text-[0.6rem] font-semibold px-1 py-0.5 rounded ml-1 ${CONF_CLS(conf)}`}>
              {Math.round(conf * 100)}%
            </span>
          )}
          {(ctrl["source-rules"] ?? []).map((r) => (
            <SourceRulePill key={r} ruleCode={r} controlNotes={controlNotes} onClick={onPillClick} />
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
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={answers[`${ctrl.id}__ci_${i}_${j}`] === "true"}
                        onChange={(e) => onAnswer(`${ctrl.id}__ci_${i}_${j}`, e.target.checked ? "true" : "false")}
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
            <label key={i} className="flex items-start gap-2.5 py-1 border-b border-slate-50 last:border-b-0 cursor-pointer">
              <input
                type="checkbox"
                checked={answers[`${ctrl.id}__ci_${i}`] === "true"}
                onChange={(e) => onAnswer(`${ctrl.id}__ci_${i}`, e.target.checked ? "true" : "false")}
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
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm resize-y min-h-[34px] font-sans focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  );
}

function FormLinkBlock({ link, answers, controlNotes, introAnswers, onPillClick, regulationId }: {
  link: NonNullable<ProcessFormData["form_links"]>[number];
  answers: Answers;
  controlNotes: Record<string, ControlNote>;
  introAnswers: Answers;
  onPillClick: (ruleCode: string, rect: DOMRect) => void;
  regulationId: string;
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
                  allControls={linkedForm.controls}
                  rules={linkedForm.rules}
                  answers={linkedAnswers}
                  introAnswers={introAnswers}
                  controlNotes={controlNotes}
                  formLinks={[]}
                  onAnswer={(k, v) => setLinkedAnswers((prev) => ({ ...prev, [k]: v }))}
                  onPillClick={onPillClick}
                  regulationId={regulationId}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, controls, allControls, rules, answers, introAnswers, controlNotes, formLinks, onAnswer, onPillClick, regulationId }: {
  group: ProcessFormData["groups"][number];
  controls: ProcessControl[];
  allControls: ProcessControl[];
  rules: ProcessFormData["rules"];
  answers: Answers;
  introAnswers: Answers;
  controlNotes: Record<string, ControlNote>;
  formLinks: NonNullable<ProcessFormData["form_links"]>;
  onAnswer: (k: string, v: string) => void;
  onPillClick: (ruleCode: string, rect: DOMRect) => void;
  regulationId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const visible = checkVisibility(group.id, rules, answers, introAnswers);
  const anyControlVisible = controls.some((c) => checkVisibility(c.id, rules, answers, introAnswers));

  if (!visible || (controls.length > 0 && !anyControlVisible)) return null;

  const isSubprocess = group.variant === "subprocess";
  const { score, total, green } = getGroupScore(group.id, allControls, rules, answers, introAnswers);

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
        {total > 0 && (
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scoreClasses(score, total)}`}>
            {green}/{total}
          </span>
        )}
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
                  controlNotes={controlNotes}
                  onAnswer={onAnswer}
                  onPillClick={onPillClick}
                />
              ) : (
                <ControlRow
                  key={ctrl.id}
                  ctrl={ctrl}
                  answers={answers}
                  rules={rules}
                  introAnswers={introAnswers}
                  controlNotes={controlNotes}
                  onAnswer={onAnswer}
                  onPillClick={onPillClick}
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
                      controlNotes={controlNotes}
                      introAnswers={introAnswers}
                      onPillClick={onPillClick}
                      regulationId={regulationId}
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

const SEV_BORDER = {
  approved: "border-l-green-500 bg-green-50",
  info:     "border-l-gray-400 bg-gray-50",
  warning:  "border-l-yellow-400 bg-yellow-50",
  error:    "border-l-red-500 bg-red-50",
};

function CommentPopover({ popover, controlNotes, onClose, onSave }: {
  popover: CommentPopoverState;
  controlNotes: Record<string, ControlNote>;
  onClose: () => void;
  onSave: (ruleCode: string, severity: ControlNote["severity"], comment: string) => void;
}) {
  const existing = controlNotes[popover.ruleCode];
  const [severity, setSeverity] = useState<ControlNote["severity"]>(existing?.severity ?? "warning");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Position: try below pill, flip up if near viewport bottom
  const W = 300, H = 280;
  let left = Math.min(popover.x, window.innerWidth - W - 8);
  let top = popover.y + 6;
  if (top + H > window.innerHeight - 8) top = Math.max(8, popover.y - H - 6);

  function handleSave() {
    onSave(popover.ruleCode, severity, comment);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left, top, width: W, zIndex: 2000 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
          {popover.ruleCode}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1">×</button>
      </div>

      {existing?.comment && (
        <div className={`text-sm border-l-4 px-2 py-1.5 rounded-sm mb-2 ${SEV_BORDER[existing.severity]}`}>
          {existing.comment}
        </div>
      )}

      <select
        value={severity}
        onChange={(e) => setSeverity(e.target.value as ControlNote["severity"])}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-1.5 font-sans bg-white"
      >
        <option value="approved">✓ Approved — correct, no change needed</option>
        <option value="info">ℹ Info — neutral note</option>
        <option value="warning">⚠ Warning — needs attention</option>
        <option value="error">✕ Error — incorrect, must fix</option>
      </select>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Your comment on this rule…"
        autoFocus
        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mb-1.5 resize-y min-h-[56px] font-sans focus:outline-none focus:border-blue-400"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="text-xs px-2.5 py-1.5 border border-gray-200 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        {saved && <span className="text-xs text-green-600 font-semibold">Saved ✓</span>}
      </div>
    </div>
  );
}

// ─── Main ProcessForm component ───────────────────────────────────────────────

export function ProcessForm({
  form,
  feedback,
  initialAnswers,
  introAnswers,
  regulationId,
  sectionId,
  formId,
  onAnswersChange,
}: ProcessFormProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [commentPopover, setCommentPopover] = useState<CommentPopoverState | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, ControlNote>>(
    feedback?.control_notes ?? {},
  );
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

  function handlePillClick(ruleCode: string, rect: DOMRect) {
    if (commentPopover?.ruleCode === ruleCode) {
      setCommentPopover(null);
    } else {
      setCommentPopover({ ruleCode, x: rect.left, y: rect.bottom });
    }
  }

  function handleCommentSave(ruleCode: string, severity: ControlNote["severity"], comment: string) {
    const updated = { ...localNotes };
    if (comment.trim()) {
      updated[ruleCode] = { comment: comment.trim(), severity };
    } else {
      delete updated[ruleCode];
    }
    setLocalNotes(updated);

    // POST to feedback API using formId (defaults to sectionId)
    const feedbackKey = formId ?? sectionId;
    fetch(`/api/compliance/feedback/${feedbackKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ control_notes: updated }),
    }).catch(() => {});
  }

  const subScoping = form.sub_scoping ?? [];
  const hasSubScoping = subScoping.length > 0;
  const anySubSelected = hasSubScoping && subScoping.some((s) => answers[s.id] === "Yes");
  const formLinks = form.form_links ?? [];
  const controlNotes = localNotes;

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

  return (
    <div>
      {/* Feedback bar */}
      {feedback?.last_updated && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded px-3 py-1.5 mb-3">
          <span>💬</span>
          <span>
            Last feedback:{" "}
            <strong className="text-gray-700">
              {new Date(feedback.last_updated).toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric",
              })}
            </strong>
          </span>
        </div>
      )}

      {/* Sub-scoping panel */}
      {hasSubScoping && (
        <SubScopingPanel
          subScoping={subScoping}
          answers={answers}
          onToggle={handleSubTypeToggle}
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
          {/* Stats bar */}
          <StatsBar form={form} answers={answers} rules={form.rules} introAnswers={introAnswers} />

          {/* Groups */}
          {form.groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              controls={controlsByGroup[group.id] ?? []}
              allControls={form.controls}
              rules={form.rules}
              answers={answers}
              introAnswers={introAnswers}
              controlNotes={controlNotes}
              formLinks={formLinks}
              onAnswer={handleAnswer}
              onPillClick={handlePillClick}
              regulationId={regulationId}
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
                  <ChecklistControl key={ctrl.id} ctrl={ctrl} answers={answers} rules={form.rules} introAnswers={introAnswers} controlNotes={controlNotes} onAnswer={handleAnswer} onPillClick={handlePillClick} />
                ) : (
                  <ControlRow key={ctrl.id} ctrl={ctrl} answers={answers} rules={form.rules} introAnswers={introAnswers} controlNotes={controlNotes} onAnswer={handleAnswer} onPillClick={handlePillClick} />
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
                controlNotes={controlNotes}
                introAnswers={introAnswers}
                onPillClick={handlePillClick}
                regulationId={regulationId}
              />
            ))}
        </>
      )}

      {/* Save button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onAnswersChange(answers)}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Save Progress
        </button>
      </div>

      {/* Comment popover */}
      {commentPopover && (
        <CommentPopover
          popover={commentPopover}
          controlNotes={controlNotes}
          onClose={() => setCommentPopover(null)}
          onSave={handleCommentSave}
        />
      )}
    </div>
  );
}
