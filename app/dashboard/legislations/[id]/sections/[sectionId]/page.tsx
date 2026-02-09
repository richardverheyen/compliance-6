"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { SectionForm } from "@/components/compliance/SectionForm";
import { SectionStatus } from "@/components/compliance/SectionStatus";
import type { Legislation, LegislationSection } from "@/lib/types/compliance";
import type { FormField, FormGroup, FormRule } from "@/lib/compliance-forms";

export default function SectionFormPage() {
  const params = useParams();
  const legislationId = params.id as string;
  const sectionId = params.sectionId as string;

  const { legislations, fetchLegislations, getSectionAnswers } =
    useComplianceStore();

  const [legislation, setLegislation] = useState<Legislation | undefined>();
  const [section, setSection] = useState<LegislationSection | undefined>();
  const [sectionMeta, setSectionMeta] = useState<{
    fields: FormField[];
    groups: FormGroup[];
    rules: FormRule[];
  } | null>(null);

  useEffect(() => {
    if (legislations.length === 0) fetchLegislations();
  }, [legislations.length, fetchLegislations]);

  useEffect(() => {
    const leg = legislations.find((l) => l.id === legislationId);
    setLegislation(leg);
    setSection(leg?.sections.find((s) => s.id === sectionId));
  }, [legislations, legislationId, sectionId]);

  // Fetch section metadata for status display
  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/compliance/legislations/${legislationId}/sections/${sectionId}/schema`,
      );
      const data = await res.json();
      setSectionMeta({
        fields: data.fields || [],
        groups: data.groups || [],
        rules: data.rules || [],
      });
    }
    load();
  }, [legislationId, sectionId]);

  const answers = getSectionAnswers(legislationId, sectionId);

  // Find prev/next section for navigation
  const sections = legislation?.sections || [];
  const currentIdx = sections.findIndex((s) => s.id === sectionId);
  const prevSection = currentIdx > 0 ? sections[currentIdx - 1] : null;
  const nextSection =
    currentIdx < sections.length - 1 ? sections[currentIdx + 1] : null;

  if (!legislation || !section) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard/legislations"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Legislations
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/legislations/${legislationId}`}
            className="text-indigo-600 hover:text-indigo-500"
          >
            {legislation.shortName}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{section.title}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {section.title}
        </h1>
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
            legislationId={legislationId}
            sectionId={sectionId}
          />
        </div>

        {/* Prev/Next navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
          {prevSection ? (
            <Link
              href={`/dashboard/legislations/${legislationId}/sections/${prevSection.id}`}
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
              href={`/dashboard/legislations/${legislationId}/sections/${nextSection.id}`}
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
