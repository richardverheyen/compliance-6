"use client";

import React, { useMemo, useState } from "react";
import {
  rankWith,
  isEnumControl,
  isStringControl,
  isControl,
  optionIs,
  and,
  uiTypeIs,
  computeLabel,
  isDescriptionHidden,
  type ControlProps,
  type EnumCellProps,
  type LayoutProps,
  type RankedTester,
  type OwnPropsOfEnum,
  type LabelProps,
} from "@jsonforms/core";
import {
  withJsonFormsControlProps,
  withJsonFormsEnumProps,
  withJsonFormsLayoutProps,
  withJsonFormsLabelProps,
  useJsonForms,
  JsonFormsDispatch,
  DispatchCell,
} from "@jsonforms/react";
// Simple helpers to avoid lodash dependency
function merge<T extends Record<string, unknown>>(...objects: (T | undefined)[]): T {
  return Object.assign({}, ...objects.filter(Boolean)) as T;
}
function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === "";
}

// ---------------------------------------------------------------------------
// Radio Group Renderer (Yes/No fields)
// ---------------------------------------------------------------------------

const TailwindRadioGroup = (
  props: ControlProps & OwnPropsOfEnum,
) => {
  const {
    id,
    label,
    required,
    description,
    errors,
    data,
    visible,
    enabled,
    path,
    handleChange,
    options,
    uischema,
    config,
  } = props;

  const appliedOptions = merge({}, config, uischema.options);
  const isValid = errors.length === 0;
  const [isFocused, setFocused] = useState(false);
  const showDescription =
    !isDescriptionHidden(visible, description, isFocused, appliedOptions.showUnfocusedDescription);

  if (!visible) return null;

  return (
    <div
      className="py-3"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <label className="block text-sm font-medium text-gray-700">
        {computeLabel(label, required ?? false, appliedOptions.hideRequiredAsterisk)}
      </label>
      <div className="mt-2 flex gap-6">
        {(options ?? []).map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2 text-sm ${
              !enabled ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={data === option.value}
              onChange={() => handleChange(path, option.value)}
              disabled={!enabled}
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      {!isValid && (
        <p className="mt-1 text-xs text-red-600">{errors}</p>
      )}
      {isValid && showDescription && description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};

export const tailwindRadioGroupTester: RankedTester = rankWith(
  10,
  and(isEnumControl, optionIs("format", "radio")),
);

const TailwindRadioGroupRenderer = withJsonFormsEnumProps(TailwindRadioGroup);

// ---------------------------------------------------------------------------
// Text Input Renderer (detail text fields)
// ---------------------------------------------------------------------------

const TailwindTextInput = (props: ControlProps) => {
  const {
    id,
    label,
    required,
    description,
    errors,
    data,
    visible,
    enabled,
    path,
    handleChange,
    uischema,
    schema,
    config,
  } = props;

  const appliedOptions = merge({}, config, uischema.options);
  const isValid = errors.length === 0;
  const [isFocused, setFocused] = useState(false);
  const showDescription =
    !isDescriptionHidden(visible, description, isFocused, appliedOptions.showUnfocusedDescription);

  if (!visible) return null;

  const isMultiLine = schema.maxLength ? schema.maxLength > 200 : false;
  const InputComponent = isMultiLine ? "textarea" : "input";

  return (
    <div
      className="py-2"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <label
        htmlFor={`${id}-input`}
        className="block text-sm font-medium text-gray-700"
      >
        {computeLabel(label, required ?? false, appliedOptions.hideRequiredAsterisk)}
      </label>
      <InputComponent
        id={`${id}-input`}
        type={isMultiLine ? undefined : "text"}
        value={data ?? ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          handleChange(path, e.target.value === "" ? undefined : e.target.value)
        }
        disabled={!enabled}
        placeholder={appliedOptions.placeholder}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
          isValid
            ? "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            : "border-red-300 focus:border-red-500 focus:ring-red-500"
        } ${!enabled ? "bg-gray-50 text-gray-500" : ""}`}
        {...(isMultiLine ? { rows: 3 } : {})}
      />
      {!isValid && (
        <p className="mt-1 text-xs text-red-600">{errors}</p>
      )}
      {isValid && showDescription && description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};

export const tailwindTextInputTester: RankedTester = rankWith(
  10,
  and(isStringControl, (uischema) => {
    // Match text controls that do NOT have format: radio (those are enums)
    return !(uischema as { options?: { format?: string } }).options?.format;
  }),
);

const TailwindTextInputRenderer = withJsonFormsControlProps(TailwindTextInput);

// ---------------------------------------------------------------------------
// Group Layout Renderer
// ---------------------------------------------------------------------------

const TailwindGroupLayout = (props: LayoutProps) => {
  const { uischema, schema, path, enabled, visible, label } = props;
  const group = uischema as { elements?: unknown[] };
  const { renderers, cells } = useJsonForms();

  if (visible === false) return null;

  const elements = group.elements ?? [];

  return (
    <fieldset
      className="mt-6 rounded-xl border border-gray-200 bg-white p-5"
      hidden={visible === undefined || visible === null ? false : !visible}
    >
      {!isEmpty(label) && (
        <legend className="-ml-1 px-2 text-base font-semibold text-gray-900">
          {label}
        </legend>
      )}
      <div className="divide-y divide-gray-100">
        {elements.map((child, index) => (
          <div key={`${path}-${index}`}>
            <JsonFormsDispatch
              renderers={renderers ?? undefined}
              cells={cells ?? undefined}
              uischema={child as never}
              schema={schema}
              path={path}
              enabled={enabled}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
};

export const tailwindGroupTester: RankedTester = rankWith(10, uiTypeIs("Group"));

const TailwindGroupRenderer = withJsonFormsLayoutProps(TailwindGroupLayout);

// ---------------------------------------------------------------------------
// Label Renderer (group descriptions)
// ---------------------------------------------------------------------------

const TailwindLabel = (props: LabelProps & { visible?: boolean }) => {
  const { text, visible } = props;

  if (visible === false) return null;

  return (
    <p className="py-2 text-sm text-gray-500">
      {text}
    </p>
  );
};

export const tailwindLabelTester: RankedTester = rankWith(10, uiTypeIs("Label"));

const TailwindLabelRenderer = withJsonFormsLabelProps(TailwindLabel);

// ---------------------------------------------------------------------------
// Vertical Layout Renderer
// ---------------------------------------------------------------------------

const TailwindVerticalLayout = (props: LayoutProps) => {
  const { uischema, schema, path, enabled, visible } = props;
  const layout = uischema as { elements?: unknown[] };
  const { renderers, cells } = useJsonForms();

  if (visible === false) return null;

  const elements = layout.elements ?? [];

  return (
    <div hidden={visible === undefined || visible === null ? false : !visible}>
      {elements.map((child, index) => (
        <div key={`${path}-${index}`}>
          <JsonFormsDispatch
            renderers={renderers ?? undefined}
            cells={cells ?? undefined}
            uischema={child as never}
            schema={schema}
            path={path}
            enabled={enabled}
          />
        </div>
      ))}
    </div>
  );
};

export const tailwindVerticalLayoutTester: RankedTester = rankWith(
  10,
  uiTypeIs("VerticalLayout"),
);

const TailwindVerticalLayoutRenderer = withJsonFormsLayoutProps(
  TailwindVerticalLayout,
  false,
);

// ---------------------------------------------------------------------------
// Export all renderers
// ---------------------------------------------------------------------------

export const tailwindRenderers = [
  { tester: tailwindRadioGroupTester, renderer: TailwindRadioGroupRenderer },
  { tester: tailwindTextInputTester, renderer: TailwindTextInputRenderer },
  { tester: tailwindGroupTester, renderer: TailwindGroupRenderer },
  { tester: tailwindLabelTester, renderer: TailwindLabelRenderer },
  { tester: tailwindVerticalLayoutTester, renderer: TailwindVerticalLayoutRenderer },
];
