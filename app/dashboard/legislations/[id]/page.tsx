"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import type { Legislation } from "@/lib/types/compliance";

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

export default function LegislationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    legislations,
    fetchLegislations,
    getActiveLegislation,
    activateLegislation,
    isLoading,
  } = useComplianceStore();

  const [legislation, setLegislation] = useState<Legislation | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    if (legislations.length === 0) {
      fetchLegislations();
    }
  }, [legislations.length, fetchLegislations]);

  useEffect(() => {
    const found = legislations.find((l) => l.id === id);
    setLegislation(found);
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
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await activateLegislation(id, {
      businessName,
      location,
      foundingYear: Number(foundingYear),
      employeeCount: Number(employeeCount),
      services: selectedServices,
    });
    router.push("/dashboard");
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
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

        {/* Requirements summary */}
        <div className="mt-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Required Business Processes
          </h2>
          <div className="mt-4 space-y-4">
            {legislation.requirements.map((req) => (
              <div key={req.id}>
                <h3 className="font-medium text-gray-900">{req.title}</h3>
                <ul className="mt-1 ml-4 list-disc space-y-0.5">
                  {req.stepTitles.map((step) => (
                    <li key={step} className="text-sm text-gray-600">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Active banner or intro form */}
        {active ? (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
            <p className="font-medium text-green-800">
              This legislation is active for your business.
            </p>
            <Link
              href="/dashboard"
              className="mt-2 inline-block text-sm font-medium text-green-700 underline hover:text-green-600"
            >
              View compliance status on dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Introduction Form
            </h2>
            <p className="text-sm text-gray-600">
              Complete this form to activate compliance tracking for this
              legislation.
            </p>

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
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
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
                  <label
                    key={service}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Activating..." : "Activate Compliance Tracking"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
