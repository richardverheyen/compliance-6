"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import type { ProcessForm as ProcessFormData } from "@/lib/types/process-form";
import { ProcessForm } from "@/components/compliance/ProcessForm";

interface SectionFormProps {
  regulationId: string;
  sectionId: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export function SectionForm({ regulationId, sectionId, readOnly, onSave }: SectionFormProps) {
  const { getSectionAnswers, saveSectionAnswers } = useComplianceStore();
  const [form, setForm] = useState<ProcessFormData | null>(null);
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
        setForm({
          controls: data.fields ?? [],
          groups: data.groups ?? [],
          rules: data.rules ?? [],
          sub_scoping: data.sub_scoping ?? [],
          form_links: data.form_links ?? [],
        } as unknown as ProcessFormData);
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
  const introAnswers = getSectionAnswers(regulationId, "risk-assessment");

  function handleAnswersChange(answers: Record<string, string>) {
    if (!readOnly) {
      saveSectionAnswers(regulationId, sectionId, answers);
    }
  }

  function handleSave(answers: Record<string, string>) {
    if (!readOnly) {
      saveSectionAnswers(regulationId, sectionId, answers);
      onSave?.();
    }
  }

  return (
    <ProcessForm
      form={form}
      initialAnswers={initialAnswers}
      introAnswers={introAnswers}
      regulationId={regulationId}
      sectionId={sectionId}
      readOnly={readOnly}
      onAnswersChange={handleAnswersChange}
      onSave={handleSave}
    />
  );
}
