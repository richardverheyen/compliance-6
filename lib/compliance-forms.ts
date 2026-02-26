import type { ComplianceRating } from "./types/compliance";

// --- Interfaces ---

export interface FormField {
  id: string;
  label: string;
  "detail-required": boolean;
  "correct-option": string;
  "detail-label"?: string;
  // ProcessControl fields (optional for backward compat)
  group?: string;
}

export interface FormGroup {
  id: string;
  title: string;
  description?: string;
}

export interface FormRule {
  target: string;
  scope: string;
  effect: string;
  schema: { const: string };
}

export interface SectionData {
  fields: FormField[];
  groups: FormGroup[];
  rules: FormRule[];
}

// --- Helpers ---

export function mergeRecords<T>(
  existing: T[],
  incoming: T[],
  keyField: keyof T = "id" as keyof T,
): T[] {
  const merged = [...existing];
  incoming.forEach((newItem) => {
    const idx = merged.findIndex((item) => item[keyField] === newItem[keyField]);
    if (idx > -1) {
      merged[idx] = { ...merged[idx], ...newItem };
    } else {
      merged.push(newItem);
    }
  });
  return merged;
}

export function sortById(
  a: string | { id?: string },
  b: string | { id?: string },
): number {
  const idA = typeof a === "string" ? a : a?.id || "";
  const idB = typeof b === "string" ? b : b?.id || "";
  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
}

export function getParentId(id: string): string | null {
  const parts = id.split("_");
  return parts.length === 1 ? null : parts.slice(0, -1).join("_");
}

// --- Status Logic ---

export type FieldStatus = "pending" | "success" | "warning" | "error";

export function getFieldStatus(
  field: FormField,
  data: Record<string, string>,
): FieldStatus {
  const answer = data[field.id];
  return answer !== undefined && answer !== "" ? "success" : "pending";
}

export function getGroupMetrics(
  groupId: string,
  allFields: FormField[],
  allGroups: FormGroup[],
  allRules: FormRule[],
  data: Record<string, string>,
): { score: number; total: number; green: number } {
  let total = 0;
  let green = 0;

  const checkVisibility = (id: string): boolean => {
    const rule = allRules.find((r) => r.target === id);
    if (!rule) return true;
    return data[rule.scope] === rule.schema.const;
  };

  // Support slug-based groups (ProcessControl.group) and legacy prefix-based groups
  const fields = allFields.filter((f) => {
    if (f.group !== undefined) return f.group === groupId;
    return f.id.startsWith(groupId + "_") || f.id === groupId;
  });

  fields.forEach((f) => {
    if (checkVisibility(f.id)) {
      const status = getFieldStatus(f, data);
      total++;
      if (status === "success") green++;
    }
  });

  return { score: total === 0 ? 1 : green / total, total, green };
}

export function computeSectionRating(
  sectionData: SectionData,
  answers: Record<string, string>,
): ComplianceRating {
  // Root groups: those whose parent ID is not also in the group list
  const groupIds = new Set(sectionData.groups.map((g) => g.id));
  const rootGroups = sectionData.groups.filter((g) => {
    const parentId = g.id.split("_").slice(0, -1).join("_");
    return !parentId || !groupIds.has(parentId);
  });

  let totalFields = 0;
  let greenFields = 0;

  for (const root of rootGroups) {
    const metrics = getGroupMetrics(
      root.id,
      sectionData.fields,
      sectionData.groups,
      sectionData.rules,
      answers,
    );
    totalFields += metrics.total;
    greenFields += metrics.green;
  }

  // Fallback: no groups at all
  if (rootGroups.length === 0) {
    sectionData.fields.forEach((f) => {
      totalFields++;
      if (getFieldStatus(f, answers) === "success") greenFields++;
    });
  }

  if (totalFields === 0) return "green";
  const score = greenFields / totalFields;
  if (score >= 1) return "green";
  if (score >= 0.5) return "yellow";
  return "red";
}
