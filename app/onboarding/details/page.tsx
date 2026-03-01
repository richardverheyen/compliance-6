"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";

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

export default function OnboardingDetailsPage() {
  const router = useRouter();
  const { organization } = useOrganization();

  const [location, setLocation] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/compliance/regulations")
      .then((r) => r.ok ? r.json() : [])
      .then((regs: Array<{ applicableServices: string[] }>) => {
        const all = [...new Set(regs.flatMap((r) => r.applicableServices))].sort();
        setAvailableServices(all);
      });
  }, []);

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/organisation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, applicableServices: selectedServices }),
    });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Tell us about {organization?.name ?? "your organisation"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This helps us tailor your compliance experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="">Select a state or territory</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {availableServices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Applicable Services
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Select all services your organisation provides.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {availableServices.map((service) => (
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
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
