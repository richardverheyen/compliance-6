import type { ProcessForm, SubType, FormLink } from "./types/process-form";
import type { FormField, FormGroup, FormRule } from "./compliance-forms";

// --- Compile ---

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

export interface CompiledProcess {
  schema: JsonSchemaObj;
  uiSchema: UiSchemaElement;
  fields: FormField[];
  groups: FormGroup[];
  rules: FormRule[];
  sub_scoping: SubType[];
  form_links: FormLink[];
}

export function compileProcess(form: ProcessForm): CompiledProcess {
  const schema: JsonSchemaObj = { type: "object", properties: {} };

  // Add sub-type IDs as boolean-ish string properties so JsonForms SHOW rules can reference them
  for (const sub of form.sub_scoping ?? []) {
    schema.properties[sub.id] = { type: "string", enum: ["Yes"] };
  }

  // Add control properties
  for (const ctrl of form.controls) {
    schema.properties[ctrl.id] = { type: "string", enum: ["Yes", "No"] };
    if (ctrl["detail-required"]) {
      schema.properties[`${ctrl.id}_detail`] = { type: "string" };
    }
  }

  // Build uiSchema: iterate groups in declaration order
  const uiElements: UiSchemaElement[] = [];

  for (const group of form.groups) {
    const groupControls = form.controls.filter((c) => c.group === group.id);
    if (groupControls.length === 0) continue;

    const controlElements: UiSchemaElement[] = [];

    if (group.description) {
      controlElements.push({
        type: "Label",
        text: group.description,
        options: { classNames: "group-description" },
      });
    }

    for (const ctrl of groupControls) {
      const rule = form.rules.find((r) => r.target === ctrl.id);
      const mainControl: UiSchemaElement = {
        type: "Control",
        label: `[${ctrl.id}] ${ctrl.label}`,
        scope: `#/properties/${ctrl.id}`,
        options: { format: "radio" },
      };
      if (rule) {
        mainControl.rule = {
          effect: rule.effect,
          condition: {
            scope: `#/properties/${rule.scope}`,
            schema: rule.schema,
          },
        };
      }
      controlElements.push(mainControl);

      if (ctrl["detail-required"]) {
        const detailElement: UiSchemaElement = {
          type: "Control",
          label: ctrl["detail-label"] || "Please provide details:",
          scope: `#/properties/${ctrl.id}_detail`,
          rule: {
            effect: "SHOW",
            condition: {
              scope: `#/properties/${ctrl.id}`,
              schema: { const: "Yes" },
            },
          },
        };
        controlElements.push(detailElement);
      }
    }

    const groupUI: UiSchemaElement = {
      type: "Group",
      label: group.title,
      elements: controlElements,
    };

    // Apply group-level rule if any
    const groupRule = form.rules.find((r) => r.target === group.id);
    if (groupRule) {
      groupUI.rule = {
        effect: groupRule.effect,
        condition: {
          scope: `#/properties/${groupRule.scope}`,
          schema: groupRule.schema,
        },
      };
    }

    uiElements.push(groupUI);
  }

  // Cast controls to FormField for backward compat
  const fields = form.controls as unknown as FormField[];
  const groups = form.groups as FormGroup[];
  const rules = form.rules as FormRule[];

  return {
    schema,
    uiSchema: { type: "VerticalLayout", elements: uiElements },
    fields,
    groups,
    rules,
    sub_scoping: form.sub_scoping ?? [],
    form_links: form.form_links ?? [],
  };
}
