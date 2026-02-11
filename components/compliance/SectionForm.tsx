"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { JsonForms } from "@jsonforms/react";
import { vanillaCells } from "@jsonforms/vanilla-renderers";
import { tailwindRenderers } from "@/components/compliance/tailwind-renderers";
import { useComplianceStore } from "@/lib/compliance-store";

interface SectionFormProps {
  legislationId: string;
  sectionId: string;
  onSave?: () => void;
}

interface SchemaData {
  schema: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiSchema: any;
}

export function SectionForm({
  legislationId,
  sectionId,
  onSave,
}: SectionFormProps) {
  const { getSectionAnswers, saveSectionAnswers } = useComplianceStore();
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadSchema() {
      setLoading(true);
      const res = await fetch(
        `/api/compliance/legislations/${legislationId}/sections/${sectionId}/schema`,
      );
      const data = await res.json();
      setSchemaData({ schema: data.schema, uiSchema: data.uiSchema });

      // Load existing answers
      const existing = getSectionAnswers(legislationId, sectionId);
      setFormData(existing);
      setLoading(false);
    }
    loadSchema();
  }, [legislationId, sectionId, getSectionAnswers]);

  const handleChange = useCallback(
    ({ data }: { data: Record<string, string> }) => {
      setFormData(data);

      // Debounced auto-save (500ms)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveSectionAnswers(legislationId, sectionId, data);
      }, 500);
    },
    [legislationId, sectionId, saveSectionAnswers],
  );

  function handleExplicitSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveSectionAnswers(legislationId, sectionId, formData);
    onSave?.();
  }

  if (loading || !schemaData) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading form...
      </div>
    );
  }

  return (
    <div>
      <div>
        <JsonForms
          schema={schemaData.schema}
          uischema={schemaData.uiSchema}
          data={formData}
          renderers={tailwindRenderers}
          cells={vanillaCells}
          onChange={handleChange}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleExplicitSave}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Save Progress
        </button>
      </div>
    </div>
  );
}
