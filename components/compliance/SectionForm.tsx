"use client";

import { useEffect, useState } from "react";
import { useComplianceStore } from "@/lib/compliance-store";
import { getProcessFormForSection, SECTION_TO_PROCESS } from "@/lib/process-forms";
import type { FeedbackData } from "@/lib/types/process-form";
import { ProcessForm } from "@/components/compliance/ProcessForm";

interface SectionFormProps {
  regulationId: string;
  sectionId: string;
  onSave?: () => void;
}

export function SectionForm({ regulationId, sectionId, onSave }: SectionFormProps) {
  const { getSectionAnswers, saveSectionAnswers } = useComplianceStore();
  const [feedback, setFeedback] = useState<FeedbackData | undefined>(undefined);

  // Fetch feedback for this process slug (non-blocking)
  useEffect(() => {
    const slug = SECTION_TO_PROCESS[sectionId];
    if (!slug) return;
    fetch(`/api/compliance/feedback/${slug}`)
      .then((r) => r.json())
      .then((data: FeedbackData) => {
        if (data?.control_notes || data?.notes) setFeedback(data);
      })
      .catch(() => {});
  }, [sectionId]);

  // Load the process form directly (synchronous static import — no API fetch needed)
  let form;
  try {
    form = getProcessFormForSection(sectionId);
  } catch {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No form found for section {sectionId}.
      </div>
    );
  }

  const initialAnswers = getSectionAnswers(regulationId, sectionId);
  const introAnswers = getSectionAnswers(regulationId, "4_1");

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
      onAnswersChange={handleAnswersChange}
    />
  );
}
