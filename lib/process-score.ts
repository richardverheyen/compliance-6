import type { ProcessControl } from "@/lib/types/process-form";

type Rules = Array<{
  target: string;
  scope: string;
  effect: string;
  schema: { const: string };
}>;

type Answers = Record<string, string>;

export function checkVisibility(
  id: string,
  rules: Rules,
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

export interface ControlScore {
  ctrl: ProcessControl;
  isCorrect: boolean;
  answer: string | undefined;
}

export interface ProcessScore {
  correct: number;
  total: number;
  pct: number;
  controlScores: ControlScore[];
}

export function computeProcessScore(
  controls: ProcessControl[],
  rules: Rules,
  answers: Answers,
  introAnswers: Answers,
): ProcessScore {
  let correct = 0;
  let total = 0;
  const controlScores: ControlScore[] = [];

  for (const ctrl of controls) {
    const correctOption = ctrl["correct-option"];
    // Skip informational (N/A) controls and controls without a correct answer defined
    if (!correctOption || correctOption === "N/A") continue;
    // Skip invisible controls
    if (!checkVisibility(ctrl.id, rules, answers, introAnswers)) continue;

    total++;

    let isCorrect: boolean;
    if (ctrl["checklist-items"]) {
      isCorrect = correctOption === "Yes" && getChecklistStatus(ctrl, answers) === "success";
    } else {
      isCorrect = answers[ctrl.id] === correctOption;
    }

    if (isCorrect) correct++;
    controlScores.push({ ctrl, isCorrect, answer: answers[ctrl.id] });
  }

  return {
    correct,
    total,
    pct: total > 0 ? Math.round((correct / total) * 100) : 100,
    controlScores,
  };
}

export function getScoreColor(pct: number): "green" | "amber" | "red" {
  if (pct === 100) return "green";
  if (pct >= 70) return "amber";
  return "red";
}
