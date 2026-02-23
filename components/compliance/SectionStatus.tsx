"use client";

import { useState } from "react";
import type { FormField, FormGroup, FormRule, FieldStatus } from "@/lib/compliance-forms";
import { getFieldStatus } from "@/lib/compliance-forms";

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

// Determine if a field belongs to a group — supports both slug-based (ProcessControl.group)
// and hierarchical-prefix-based (legacy FormField) matching.
function fieldBelongsToGroup(field: FormField, groupId: string): boolean {
  if ("group" in field && typeof (field as { group: string }).group === "string") {
    return (field as { group: string }).group === groupId;
  }
  const parts = field.id.split("_");
  return parts.slice(0, -1).join("_") === groupId;
}

// Groups are flat slugs (no nesting) for ProcessForms.
// For legacy hierarchical IDs, find child groups by prefix.
function getChildGroups(group: FormGroup, allGroups: FormGroup[]): FormGroup[] {
  // Slug-based: no children (flat structure)
  if (!/^\d/.test(group.id)) return [];
  // Legacy hierarchical
  return allGroups.filter((g) => {
    const parts = g.id.split("_");
    return parts.slice(0, -1).join("_") === group.id;
  });
}

function getGroupMetrics(
  group: FormGroup,
  allFields: FormField[],
  allRules: FormRule[],
  data: Record<string, string>,
): { score: number; total: number; green: number } {
  let total = 0;
  let green = 0;

  const checkVisibility = (id: string): boolean => {
    const rule = allRules.find((r) => r.target === id);
    return !rule || data[rule.scope] === rule.schema.const;
  };

  const fields = allFields.filter((f) => fieldBelongsToGroup(f, group.id));
  fields.forEach((f) => {
    if (checkVisibility(f.id)) {
      const status = getFieldStatus(f, data);
      total++;
      if (status === "success") green++;
    }
  });

  return { score: total === 0 ? 1 : green / total, total, green };
}

function GroupNode({
  group,
  allFields,
  allGroups,
  allRules,
  data,
  depth = 0,
}: {
  group: FormGroup;
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

  const { score, total, green } = getGroupMetrics(group, allFields, allRules, data);
  if (total === 0) return null;

  const childGroups = getChildGroups(group, allGroups);
  const childFields = allFields.filter((f) => fieldBelongsToGroup(f, group.id));

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
            <GroupNode
              key={g.id}
              group={g}
              allFields={allFields}
              allGroups={allGroups}
              allRules={allRules}
              data={data}
              depth={depth + 1}
            />
          ))}
          {childFields.map((f) => {
            if (!checkVisibility(f.id)) return null;
            const status = getFieldStatus(f, data);
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 py-0.5"
                style={{ paddingLeft: `${(depth + 1) * 4}px` }}
              >
                <StatusDot status={status} />
                <span className="text-xs text-gray-500 font-mono">{f.id}</span>
                <span className="text-sm text-gray-700 truncate">{f.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SectionStatus({ fields, groups, rules, answers }: SectionStatusProps) {
  // Root groups: for slug IDs (no underscore-separated parent), all are roots.
  // For legacy hierarchical IDs, filter by whether their parent ID exists in groups.
  const groupIds = new Set(groups.map((g) => g.id));
  const rootGroups = groups.filter((g) => {
    const parentId = g.id.split("_").slice(0, -1).join("_");
    return !parentId || !groupIds.has(parentId);
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Compliance Status
      </h3>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {rootGroups.map((group) => (
          <GroupNode
            key={group.id}
            group={group}
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
