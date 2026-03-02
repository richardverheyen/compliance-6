"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { SectionForm } from "@/components/compliance/SectionForm";
import { usePdfPanel } from "../../../../_context";
import type { Regulation } from "@/lib/types/compliance";
import type { RegulationManifest, ProcessListEntry } from "@/lib/types/regulation-content";

function getAssessmentNumber(assessmentId: string, allAssessments: { id: string; startedAt: string }[]): number {
  const sorted = [...allAssessments].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  return sorted.findIndex((a) => a.id === assessmentId) + 1;
}

export default function AssessmentProcessPage() {
  const params = useParams();
  const router = useRouter();
  const regulationId = params.id as string;
  const assessmentId = params.assessmentId as string;
  const processId = params.processId as string;

  const { pdfVisible, togglePdf, pdfUrl } = usePdfPanel();
  const { regulations, getActiveRegulation, getAssessmentById } = useComplianceStore();
  const [regulation, setRegulation] = useState<Regulation | undefined>();
  const [manifest, setManifest] = useState<RegulationManifest | null>(null);

  useEffect(() => {
    setRegulation(regulations.find((l) => l.id === regulationId));
  }, [regulations, regulationId]);

  useEffect(() => {
    fetch(`/api/compliance/regulations/${regulationId}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest);
  }, [regulationId]);

  const active = getActiveRegulation(regulationId);
  const assessment = getAssessmentById(regulationId, assessmentId);

  const processList: ProcessListEntry[] = manifest?.processList ?? [];
  const currentProcess = processList.find((p) => p.id === processId);
  const currentIdx = processList.findIndex((p) => p.id === processId);
  const prevProcess = currentIdx > 0 ? processList[currentIdx - 1] : null;
  const nextProcess = currentIdx < processList.length - 1 ? processList[currentIdx + 1] : null;

  const assessmentNumber = assessment
    ? getAssessmentNumber(assessmentId, active?.selfAssessments ?? [])
    : 0;

  const isReadOnly = !assessment || assessment.status === "completed";
  const answers = assessment?.sectionAnswers[processId];
  const introAnswers = assessment?.sectionAnswers["risk-assessment"];

  if (!regulation) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!assessment) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-gray-500">Assessment not found.</p>
        <Link
          href={`/dashboard/regulations/${regulationId}`}
          className="mt-2 block text-sm text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to {regulation.shortName}
        </Link>
      </div>
    );
  }

  const baseHref = `/dashboard/regulations/${regulationId}/assessments/${assessmentId}/processes`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb + PDF toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/regulations" className="text-indigo-600 hover:text-indigo-500">
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
          <span className="text-gray-500">Assessment #{assessmentNumber}</span>
          <span>/</span>
          <span className="text-gray-900">{currentProcess?.title ?? processId}</span>
        </div>
        {pdfUrl && (
          <button
            onClick={togglePdf}
            className="hidden lg:flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfVisible ? "Hide regulation documents" : "Show regulation documents"}
          </button>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        {currentProcess?.title ?? processId}
      </h1>
      {currentProcess?.description && (
        <p className="mt-2 text-gray-600">{currentProcess.description}</p>
      )}

      {/* Read-only banner for completed assessments */}
      {isReadOnly && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            This assessment is completed — answers are read-only.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="mt-6">
        <SectionForm
          regulationId={regulationId}
          sectionId={processId}
          readOnly={isReadOnly}
          answers={answers}
          introAnswers={introAnswers}
          onSave={() => router.push(`/dashboard/regulations/${regulationId}`)}
        />
      </div>

      {/* Prev/Next navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
        {prevProcess ? (
          <Link
            href={`${baseHref}/${prevProcess.id}`}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {prevProcess.title}
          </Link>
        ) : (
          <span />
        )}
        {nextProcess ? (
          <Link
            href={`${baseHref}/${nextProcess.id}`}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {nextProcess.title}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
