import type { ComplianceRating } from "./types/compliance";

// --- Interfaces ---

export interface FormField {
  id: string;
  label: string;
  "detail-required": boolean;
  "correct-option": string;
  "detail-label"?: string;
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
  const detail = data[`${field.id}_detail`];

  if (answer === undefined || answer === "") return "pending";
  if (!field["correct-option"] || field["correct-option"] === "N/A")
    return "success";
  if (answer !== field["correct-option"]) return "error";
  if (field["detail-required"] && (!detail || detail.trim() === ""))
    return "warning";
  return "success";
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

  const fields = allFields.filter(
    (f) => f.id.startsWith(groupId + "_") || f.id === groupId,
  );
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
  // Find the root group for this section
  const rootGroups = sectionData.groups.filter(
    (g) =>
      !sectionData.groups
        .map((x) => x.id)
        .includes(getParentId(g.id) ?? ""),
  );

  let totalFields = 0;
  let greenFields = 0;
  let hasError = false;

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

  // Also count top-level fields not under any root group
  if (rootGroups.length === 0) {
    sectionData.fields.forEach((f) => {
      const status = getFieldStatus(f, answers);
      totalFields++;
      if (status === "success") greenFields++;
      if (status === "error") hasError = true;
    });
  }

  // Check for any errors
  for (const field of sectionData.fields) {
    const status = getFieldStatus(field, answers);
    if (status === "error") {
      hasError = true;
      break;
    }
  }

  if (hasError) return "red";
  if (totalFields === 0) return "green";
  const score = greenFields / totalFields;
  if (score >= 1) return "green";
  if (score >= 0.5) return "yellow";
  return "red";
}

// --- Compile (JSON Schema + UI Schema from fields/groups/rules) ---

interface JsonSchemaObj {
  type: string;
  properties: Record<string, unknown>;
}

interface UiSchemaElement {
  type: string;
  label?: string;
  text?: string;
  scope?: string;
  options?: Record<string, unknown>;
  elements?: UiSchemaElement[];
  rule?: {
    effect: string;
    condition: { scope: string; schema: { const: string } };
  };
}

export function compile(
  fields: FormField[],
  groups: FormGroup[],
  rules: FormRule[],
): { schema: JsonSchemaObj; uiSchema: UiSchemaElement } {
  const schema: JsonSchemaObj = { type: "object", properties: {} };
  const sortedFields = [...fields].sort(sortById);
  const sortedGroups = [...groups].sort(sortById);

  sortedFields.forEach((f) => {
    schema.properties[f.id] = { type: "string", enum: ["Yes", "No"] };
    if (f["detail-required"]) {
      schema.properties[`${f.id}_detail`] = { type: "string" };
    }
  });

  const createFieldControls = (field: FormField): UiSchemaElement[] => {
    const controls: UiSchemaElement[] = [];
    const mainControl: UiSchemaElement = {
      type: "Control",
      label: `[${field.id}] ${field.label}`,
      scope: `#/properties/${field.id}`,
      options: { format: "radio" },
    };

    const externalRule = rules.find((r) => r.target === field.id);
    if (externalRule) {
      mainControl.rule = {
        effect: externalRule.effect,
        condition: {
          scope: `#/properties/${externalRule.scope}`,
          schema: externalRule.schema,
        },
      };
    }
    controls.push(mainControl);

    if (field["detail-required"]) {
      controls.push({
        type: "Control",
        label: field["detail-label"] || "Please provide details:",
        scope: `#/properties/${field.id}_detail`,
        rule: {
          effect: "SHOW",
          condition: {
            scope: `#/properties/${field.id}`,
            schema: { const: "Yes" },
          },
        },
      });
    }
    return controls;
  };

  const buildLevel = (parentId: string | null): UiSchemaElement[] => {
    const levelGroupIds = sortedGroups
      .filter((g) => getParentId(g.id) === parentId)
      .map((g) => g.id);
    const levelFieldIds = sortedFields
      .filter((f) => getParentId(f.id) === parentId)
      .map((f) => f.id);
    const uniqueIds = Array.from(new Set([...levelGroupIds, ...levelFieldIds])).sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

    return uniqueIds.flatMap((id) => {
      const field = sortedFields.find((f) => f.id === id);
      const group = sortedGroups.find((g) => g.id === id);

      if (field && group) {
        const groupElements: UiSchemaElement[] = [...createFieldControls(field)];
        if (group.description) {
          groupElements.push({
            type: "Label",
            text: group.description,
            options: { classNames: "group-description" },
          });
        }
        groupElements.push(...buildLevel(id));
        const groupUI: UiSchemaElement = {
          type: "Group",
          label: group.title,
          elements: groupElements,
        };
        const rule = rules.find((r) => r.target === id);
        if (rule) {
          groupUI.rule = {
            effect: rule.effect,
            condition: {
              scope: `#/properties/${rule.scope}`,
              schema: rule.schema,
            },
          };
        }
        return [groupUI];
      }

      if (group) {
        const groupElements: UiSchemaElement[] = [];
        if (group.description) {
          groupElements.push({
            type: "Label",
            text: group.description,
            options: { classNames: "group-description" },
          });
        }
        groupElements.push(...buildLevel(id));
        const groupUI: UiSchemaElement = {
          type: "Group",
          label: `[${group.id}] ${group.title}`,
          elements: groupElements,
        };
        const rule = rules.find((r) => r.target === id);
        if (rule) {
          groupUI.rule = {
            effect: rule.effect,
            condition: {
              scope: `#/properties/${rule.scope}`,
              schema: rule.schema,
            },
          };
        }
        return [groupUI];
      }

      return createFieldControls(field!);
    });
  };

  const roots = sortedGroups
    .filter(
      (g) =>
        !sortedGroups.map((x) => x.id).includes(getParentId(g.id) ?? ""),
    )
    .sort(sortById);

  return {
    schema,
    uiSchema: {
      type: "VerticalLayout",
      elements: roots.map((r) => {
        const rootUI: UiSchemaElement = {
          type: "Group",
          label: `[${r.id}] ${r.title}`,
          elements: [
            ...(r.description
              ? [
                  {
                    type: "Label",
                    text: r.description,
                    options: { classNames: "group-description" },
                  },
                ]
              : []),
            ...buildLevel(r.id),
          ],
        };
        const rule = rules.find((ruleObj) => ruleObj.target === r.id);
        if (rule) {
          rootUI.rule = {
            effect: rule.effect,
            condition: {
              scope: `#/properties/${rule.scope}`,
              schema: rule.schema,
            },
          };
        }
        return rootUI;
      }),
    },
  };
}
