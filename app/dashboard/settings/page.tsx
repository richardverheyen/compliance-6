"use client";

import { useState, useEffect } from "react";
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

export default function SettingsPage() {
  const { organization } = useOrganization();

  const [location, setLocation] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/organisation").then((r) => r.ok ? r.json() : null),
      fetch("/api/compliance/regulations").then((r) => r.ok ? r.json() : []),
    ]).then(([org, regs]) => {
      if (org) {
        setLocation(org.location ?? "");
        setSelectedServices(org.applicableServices ?? []);
      }
      const all = [...new Set((regs as Array<{ applicableServices: string[] }>).flatMap((r) => r.applicableServices))].sort();
      setAvailableServices(all);
      setLoading(false);
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
    setSaved(false);
    await fetch("/api/organisation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: location || null, applicableServices: selectedServices }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Organisation Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Manage your organisation&apos;s profile and compliance preferences.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Organisation name — read-only from Clerk */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Organisation</h2>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Organisation Name</label>
            <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {organization?.name ?? "—"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Managed via Clerk. Change your organisation name in your account settings.
            </p>
          </div>
        </div>

        {/* Location + Services */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Business Details</h2>
          <div className="mt-4 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <select
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          {saved && (
            <p className="text-sm font-medium text-green-600">Changes saved.</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
