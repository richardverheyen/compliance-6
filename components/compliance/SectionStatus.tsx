"use client";

import { useState } from "react";
import type { FormField, FormGroup, FormRule, FieldStatus } from "@/lib/compliance-forms";
import { getFieldStatus, getGroupMetrics, sortById } from "@/lib/compliance-forms";

interface SectionStatusProps {
  fields: FormField[];
  groups: FormGroup[];
  rules: FormRule[];
  answers: Record<string, string>;
}

const statusColors: Record<FieldStatus, string> = {
  pending: "bg-blue-400",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

const statusLabels: Record<FieldStatus, string> = {
  pending: "Pending",
  success: "Complete",
  warning: "Missing Detail",
  error: "Non-Compliant",
};

function StatusDot({ status }: { status: FieldStatus }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusColors[status]}`}
      title={statusLabels[status]}
    />
  );
}

function TreeNode({
  item,
  type,
  allFields,
  allGroups,
  allRules,
  data,
  depth = 0,
}: {
  item: FormField | FormGroup;
  type: "field" | "group";
  allFields: FormField[];
  allGroups: FormGroup[];
  allRules: FormRule[];
  data: Record<string, string>;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1);

  const checkVisibility = (id: string): boolean => {
    const rule = allRules.find((r) => r.target === id);
    return !rule || data[rule.scope] === rule.schema.const;
  };

  if (!checkVisibility(item.id)) return null;

  if (type === "field") {
    const field = item as FormField;
    const status = getFieldStatus(field, data);
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <StatusDot status={status} />
        <span className="text-xs text-gray-500 font-mono">{field.id}</span>
        <span className="text-sm text-gray-700 truncate">{field.label}</span>
      </div>
    );
  }

  const group = item as FormGroup;
  const { score, total, green } = getGroupMetrics(
    group.id,
    allFields,
    allGroups,
    allRules,
    data,
  );
  if (total === 0) return null;

  const childGroups = allGroups
    .filter((g) => {
      const parts = g.id.split("_");
      return parts.slice(0, -1).join("_") === group.id;
    })
    .sort(sortById);
  const childFields = allFields
    .filter((f) => {
      const parts = f.id.split("_");
      return parts.slice(0, -1).join("_") === group.id;
    })
    .sort(sortById);

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded py-1 text-left hover:bg-gray-50"
      >
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className={`text-sm ${depth === 0 ? "font-semibold" : "font-medium"} text-gray-900`}>
          {group.title}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${
            score >= 1
              ? "bg-green-100 text-green-700"
              : score >= 0.5
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {green}/{total}
        </span>
      </button>

      {isOpen && (
        <div className="ml-1 border-l border-gray-200 pl-2">
          {childGroups.map((g) => (
            <TreeNode
              key={g.id}
              item={g}
              type="group"
              allFields={allFields}
              allGroups={allGroups}
              allRules={allRules}
              data={data}
              depth={depth + 1}
            />
          ))}
          {childFields.map((f) => (
            <TreeNode
              key={f.id}
              item={f}
              type="field"
              allFields={allFields}
              allGroups={allGroups}
              allRules={allRules}
              data={data}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionStatus({ fields, groups, rules, answers }: SectionStatusProps) {
  const rootGroups = groups
    .filter((g) => !groups.map((x) => x.id).includes(
      g.id.split("_").slice(0, -1).join("_"),
    ))
    .sort(sortById);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Compliance Status
      </h3>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {rootGroups.map((group) => (
          <TreeNode
            key={group.id}
            item={group}
            type="group"
            allFields={fields}
            allGroups={groups}
            allRules={rules}
            data={answers}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Complete
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Missing Detail
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Non-Compliant
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> Pending
        </span>
      </div>
    </div>
  );
}
