"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { SectionForm } from "@/components/compliance/SectionForm";
import type { Legislation } from "@/lib/types/compliance";
import { getProcessRating } from "@/lib/types/compliance";

const locations = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Northern Territory",
  "Australian Capital Territory",
];

const ratingConfig = {
  red: { dot: "bg-red-500", label: "Not Started", text: "text-red-700", bg: "bg-red-50" },
  yellow: { dot: "bg-yellow-500", label: "In Progress", text: "text-yellow-700", bg: "bg-yellow-50" },
  green: { dot: "bg-green-500", label: "Complete", text: "text-green-700", bg: "bg-green-50" },
};

export default function LegislationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    legislations,
    fetchLegislations,
    getActiveLegislation,
    activateLegislation,
  } = useComplianceStore();

  const [legislation, setLegislation] = useState<Legislation | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [introAnswers, setIntroAnswers] = useState<Record<string, string>>({});
  const [showIntroForm, setShowIntroForm] = useState(false);

  useEffect(() => {
    if (legislations.length === 0) {
      fetchLegislations();
    }
  }, [legislations.length, fetchLegislations]);

  useEffect(() => {
    setLegislation(legislations.find((l) => l.id === id));
  }, [legislations, id]);

  const active = getActiveLegislation(id);

  if (!legislation) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    activateLegislation(
      id,
      {
        businessName,
        location,
        foundingYear: Number(foundingYear),
        employeeCount: Number(employeeCount),
        services: selectedServices,
      },
      introAnswers,
    );
    router.push(`/dashboard/legislations/${id}`);
    setShowIntroForm(false);
  }

  // Find section process from active legislation to show status
  function getSectionStatus(sectionId: string) {
    if (!active) return null;
    const process = active.processes.find((p) => p.id === sectionId);
    if (!process) return null;
    return getProcessRating(process);
  }

  function getSectionCompletion(sectionId: string) {
    if (!active) return { answered: 0, total: 0 };
    const process = active.processes.find((p) => p.id === sectionId);
    if (!process) return { answered: 0, total: 0 };
    const answered = process.steps.filter((s) => s.rating === "green").length;
    return { answered, total: process.steps.length };
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/legislations"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Legislations
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {legislation.name}
        </h1>
        <div className="mt-2 flex gap-3">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {legislation.agency}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {legislation.jurisdiction}
          </span>
        </div>
        <p className="mt-4 text-gray-600">{legislation.description}</p>

        {!active ? (
          <>
            {/* Not activated — show intro form */}
            <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Getting Started
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Complete the business profile and Section 4.1 introduction
                questions to activate compliance tracking.
              </p>
            </div>

            {/* Business profile form */}
            <form onSubmit={handleActivate} className="mt-6 space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900">
                  Business Profile
                </h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <select
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select a state or territory</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Founding Year
                      </label>
                      <input
                        type="number"
                        required
                        min="1900"
                        max={new Date().getFullYear()}
                        value={foundingYear}
                        onChange={(e) => setFoundingYear(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Employee Count
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Applicable Services
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {legislation.applicableServices.map((service) => (
                        <label key={service} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service)}
                            onChange={() => toggleService(service)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {service}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4.1 Introduction Questions */}
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Section 4.1: Introduction Questions
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Answer the introductory compliance questions below.
                </p>
                <div className="mt-4">
                  <IntroFormLoader
                    legislationId={id}
                    onChange={setIntroAnswers}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Activate Compliance Tracking
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Activated — show sections list */}
            <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-green-800">
                  Compliance tracking is active
                </p>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-green-700 underline hover:text-green-600"
                >
                  View Dashboard
                </Link>
              </div>
            </div>

            <h2 className="mt-8 text-xl font-semibold text-gray-900">
              Chapter 4 Sections
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Click a section to review and answer its compliance questions.
            </p>

            <div className="mt-4 space-y-3">
              {legislation.sections.map((section) => {
                const rating = getSectionStatus(section.id);
                const config = rating ? ratingConfig[rating] : ratingConfig.red;
                const { answered, total } = getSectionCompletion(section.id);

                return (
                  <Link
                    key={section.id}
                    href={`/dashboard/legislations/${id}/sections/${section.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-full ${config.dot}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {total > 0 && (
                        <span className="text-xs text-gray-500">
                          {answered}/{total}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.text} ${config.bg}`}>
                        {config.label}
                      </span>
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-component to load the intro JSON Forms inline
function IntroFormLoader({
  legislationId,
  onChange,
}: {
  legislationId: string;
  onChange: (data: Record<string, string>) => void;
}) {
  const [schemaData, setSchemaData] = useState<{
    schema: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uiSchema: any;
  } | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/compliance/legislations/${legislationId}/sections/4_1/schema`,
      );
      const data = await res.json();
      setSchemaData({ schema: data.schema, uiSchema: data.uiSchema });
    }
    load();
  }, [legislationId]);

  if (!schemaData) {
    return <p className="text-sm text-gray-500">Loading questions...</p>;
  }

  return (
    <div className="jsonforms-wrapper rounded-xl border border-gray-200 bg-white p-6">
      <JsonForms
        schema={schemaData.schema}
        uischema={schemaData.uiSchema}
        data={formData}
        renderers={vanillaRenderers}
        cells={vanillaCells}
        onChange={({ data }: { data: Record<string, string> }) => {
          setFormData(data);
          onChange(data);
        }}
      />
    </div>
  );
}

// Need these imports for the IntroFormLoader
import { JsonForms } from "@jsonforms/react";
import { vanillaRenderers, vanillaCells } from "@jsonforms/vanilla-renderers";
