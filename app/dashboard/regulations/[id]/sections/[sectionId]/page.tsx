"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { SectionForm } from "@/components/compliance/SectionForm";
import { SectionStatus } from "@/components/compliance/SectionStatus";
import type { Regulation, RegulationSection } from "@/lib/types/compliance";
import type { FormField, FormGroup, FormRule } from "@/lib/compliance-forms";
import type { ReviewMetadata } from "@/lib/types/process-form";

export default function SectionFormPage() {
  const params = useParams();
  const regulationId = params.id as string;
  const sectionId = params.sectionId as string;

  const { regulations, fetchRegulations, getSectionAnswers } =
    useComplianceStore();

  const [regulation, setRegulation] = useState<Regulation | undefined>();
  const [section, setSection] = useState<RegulationSection | undefined>();
  const [sectionMeta, setSectionMeta] = useState<{
    fields: FormField[];
    groups: FormGroup[];
    rules: FormRule[];
    _review_metadata?: ReviewMetadata;
  } | null>(null);

  useEffect(() => {
    if (regulations.length === 0) fetchRegulations();
  }, [regulations.length, fetchRegulations]);

  useEffect(() => {
    const leg = regulations.find((l) => l.id === regulationId);
    setRegulation(leg);
    setSection(leg?.sections.find((s) => s.id === sectionId));
  }, [regulations, regulationId, sectionId]);

  // Fetch section metadata for status display
  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/compliance/regulations/${regulationId}/sections/${sectionId}/schema`,
      );
      const data = await res.json();
      setSectionMeta({
        fields: data.fields || [],
        groups: data.groups || [],
        rules: data.rules || [],
        _review_metadata: data._review_metadata,
      });
    }
    load();
  }, [regulationId, sectionId]);

  const answers = getSectionAnswers(regulationId, sectionId);

  // Find prev/next section for navigation
  const sections = regulation?.sections || [];
  const currentIdx = sections.findIndex((s) => s.id === sectionId);
  const prevSection = currentIdx > 0 ? sections[currentIdx - 1] : null;
  const nextSection =
    currentIdx < sections.length - 1 ? sections[currentIdx + 1] : null;

  if (!regulation || !section) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Derive review badge from metadata
  const reviewMeta = sectionMeta?._review_metadata;
  const controlNotes = reviewMeta?.control_notes ?? {};
  const severities = Object.values(controlNotes).map((n) => n.severity);
  const reviewBadge = severities.includes("error")
    ? { label: "Review: Errors", cls: "bg-red-100 text-red-700" }
    : severities.includes("warning")
      ? { label: "Review: Warnings", cls: "bg-yellow-100 text-yellow-700" }
      : severities.includes("approved") || severities.length > 0
        ? { label: "SME Reviewed", cls: "bg-green-100 text-green-700" }
        : null;

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard/regulations"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Regulations
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/regulations/${regulationId}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            {regulation.shortName}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{section.title}</span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {section.title}
          </h1>
          {reviewBadge && (
            <span className={`mt-1.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${reviewBadge.cls}`}>
              {reviewBadge.label}
            </span>
          )}
        </div>
        {section.description && (
          <p className="mt-2 text-gray-600">{section.description}</p>
        )}

        {/* Status tree */}
        {sectionMeta && (
          <div className="mt-6">
            <SectionStatus
              fields={sectionMeta.fields}
              groups={sectionMeta.groups}
              rules={sectionMeta.rules}
              answers={answers}
            />
          </div>
        )}

        {/* Form */}
        <div className="mt-6">
          <SectionForm
            regulationId={regulationId}
            sectionId={sectionId}
          />
        </div>

        {/* Prev/Next navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
          {prevSection ? (
            <Link
              href={`/dashboard/regulations/${regulationId}/sections/${prevSection.id}`}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {prevSection.title}
            </Link>
          ) : (
            <span />
          )}
          {nextSection ? (
            <Link
              href={`/dashboard/regulations/${regulationId}/sections/${nextSection.id}`}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {nextSection.title}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
