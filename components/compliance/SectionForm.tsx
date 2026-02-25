"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { ProcessForm as ProcessFormData, FeedbackData } from "@/lib/types/process-form";
import { ProcessForm } from "@/components/compliance/ProcessForm";

interface SectionFormProps {
  regulationId: string;
  sectionId: string;
  onSave?: () => void;
}

export function SectionForm({ regulationId, sectionId, onSave }: SectionFormProps) {
  const { getSectionAnswers, saveSectionAnswers } = useComplianceStore();
  const [form, setForm] = useState<ProcessFormData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/compliance/regulations/${regulationId}/processes/${sectionId}/schema`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setForm(null);
          setLoading(false);
          return;
        }
        // The schema response has the compiled form fields; reconstruct a minimal ProcessFormData
        setForm({
          controls: data.fields ?? [],
          groups: data.groups ?? [],
          rules: data.rules ?? [],
          sub_scoping: data.sub_scoping ?? [],
          form_links: data.form_links ?? [],
          _review_metadata: data._review_metadata,
        } as unknown as ProcessFormData);
        if (data._review_metadata?.control_notes || data._review_metadata?.notes) {
          setFeedback(data._review_metadata as FeedbackData);
        }
        setLoading(false);
      })
      .catch(() => {
        setForm(null);
        setLoading(false);
      });
  }, [regulationId, sectionId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">Loading form…</div>
    );
  }

  if (!form) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No form available for this process.
      </div>
    );
  }

  const initialAnswers = getSectionAnswers(regulationId, sectionId);
  // Intro/scoping answers are stored under the risk-assessment process slug for AML
  const introAnswers = getSectionAnswers(regulationId, "risk-assessment");

  function handleAnswersChange(answers: Record<string, string>) {
    saveSectionAnswers(regulationId, sectionId, answers);
    onSave?.();
  }

  return (
    <ProcessForm
      form={form}
      feedback={feedback}
      initialAnswers={initialAnswers}
      introAnswers={introAnswers}
      regulationId={regulationId}
      sectionId={sectionId}
      formId={sectionId}
      onAnswersChange={handleAnswersChange}
    />
  );
}
