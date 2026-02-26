"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";
import {
  getRegulationProcessForSlug,
  getProcessIdForSlug,
} from "@/mocks/compliance-data";
import type { RegulationManifest } from "@/lib/types/regulation-content";

interface ConfirmedProcess {
  slug: string;
  title: string;
  regulationId: string;
  agency: string;
  jurisdiction: string;
  businessObjective: string;
  frequencyLabel: string;
  processId: string;
}

export default function ProcessesPage() {
  const {
    activeRegulations,
    regulations,
    getSectionAnswers,
    getRegulationProcessOwner,
    getTeamMembersWithAuth,
  } = useComplianceStore();

  const [manifests, setManifests] = useState<Record<string, RegulationManifest>>({});
  const [loadingManifests, setLoadingManifests] = useState(true);
  const [assignModal, setAssignModal] = useState<{ processId: string; processName: string } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState("all");
  const [sort, setSort] = useState<"az" | "za" | "regulator">("az");

  // Fetch manifests for all active regulations
  useEffect(() => {
    if (activeRegulations.length === 0) {
      setLoadingManifests(false);
      return;
    }
    setLoadingManifests(true);
    Promise.all(
      activeRegulations.map((al) =>
        fetch(`/api/compliance/regulations/${al.regulationId}/manifest`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data): [string, RegulationManifest | null] => [al.regulationId, data])
      )
    ).then((results) => {
      const map: Record<string, RegulationManifest> = {};
      for (const [id, manifest] of results) {
        if (manifest) map[id] = manifest;
      }
      setManifests(map);
      setLoadingManifests(false);
    });
  }, [activeRegulations]);

  // Build confirmed process list
  const confirmedProcesses = useMemo<ConfirmedProcess[]>(() => {
    const list: ConfirmedProcess[] = [];
    for (const al of activeRegulations) {
      const manifest = manifests[al.regulationId];
      if (!manifest) continue;
      const regulation = regulations.find((r) => r.id === al.regulationId);
      if (!regulation) continue;

      for (const entry of manifest.processList) {
        const answers = getSectionAnswers(al.regulationId, entry.id);
        if (answers["process-exists"] !== "Yes") continue;

        const regProcess = getRegulationProcessForSlug(entry.id, al.regulationId);
        const processId = getProcessIdForSlug(entry.id);
        if (!processId) continue;

        list.push({
          slug: entry.id,
          title: entry.title,
          regulationId: al.regulationId,
          agency: regulation.agency,
          jurisdiction: regulation.jurisdiction,
          businessObjective: regProcess?.businessObjective ?? "",
          frequencyLabel: regProcess?.frequencyLabel ?? "",
          processId,
        });
      }
    }
    return list;
  }, [activeRegulations, manifests, regulations, getSectionAnswers]);

  // Filter options
  const agencies = useMemo(
    () => [...new Set(confirmedProcesses.map((p) => p.agency))].sort(),
    [confirmedProcesses]
  );
  const jurisdictions = useMemo(
    () => [...new Set(confirmedProcesses.map((p) => p.jurisdiction))].sort(),
    [confirmedProcesses]
  );

  // Filtered + sorted list
  const displayedProcesses = useMemo(() => {
    let list = confirmedProcesses;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (filterAgency !== "all") {
      list = list.filter((p) => p.agency === filterAgency);
    }
    if (filterJurisdiction !== "all") {
      list = list.filter((p) => p.jurisdiction === filterJurisdiction);
    }

    if (sort === "az") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "za") {
      list = [...list].sort((a, b) => b.title.localeCompare(a.title));
    } else {
      list = [...list].sort((a, b) => a.agency.localeCompare(b.agency) || a.title.localeCompare(b.title));
    }

    return list;
  }, [confirmedProcesses, search, filterAgency, filterJurisdiction, sort]);

  const hasActiveRegulations = activeRegulations.length > 0;
  const filtersActive = search.trim() || filterAgency !== "all" || filterJurisdiction !== "all";

  function clearFilters() {
    setSearch("");
    setFilterAgency("all");
    setFilterJurisdiction("all");
  }

  // Empty states
  if (loadingManifests) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
          <div className="mt-8 flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">Loading processes…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasActiveRegulations) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
          <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No active processes</h2>
            <p className="mt-2 text-sm text-gray-600">
              Activate a regulation to see your business processes here.
            </p>
            <Link
              href="/dashboard/regulations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Browse Regulations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (confirmedProcesses.length === 0) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
          <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No processes confirmed yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Complete your self-assessment forms to confirm which processes apply to your organisation.
            </p>
            <Link
              href="/dashboard/regulations"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Go to Regulations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Business Processes</h1>
        <p className="mt-2 text-gray-600">
          View and manage your confirmed compliance processes.
        </p>

        {/* Filter / sort bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative flex-1 min-w-48">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search processes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Regulator filter */}
          <select
            value={filterAgency}
            onChange={(e) => setFilterAgency(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Regulators</option>
            {agencies.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Jurisdiction filter */}
          <select
            value={filterJurisdiction}
            onChange={(e) => setFilterJurisdiction(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Jurisdictions</option>
            {jurisdictions.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "az" | "za" | "regulator")}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
            <option value="regulator">By Regulator</option>
          </select>
        </div>

        {/* Process list */}
        {displayedProcesses.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">No processes match your filters.</p>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Table header */}
            <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 sm:grid">
              <span>Process</span>
              <span className="w-24 text-left">Regulator</span>
              <span className="w-36 text-left">Frequency</span>
              <span className="w-36 text-left">Owner</span>
              <span className="w-4" />
            </div>

            <div className="divide-y divide-gray-100">
              {displayedProcesses.map((proc) => (
                <ProcessRow
                  key={`${proc.regulationId}-${proc.slug}`}
                  process={proc}
                  getRegulationProcessOwner={getRegulationProcessOwner}
                  getTeamMembersWithAuth={getTeamMembersWithAuth}
                  onAssign={(processId, processName) =>
                    setAssignModal({ processId, processName })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {assignModal && (
        <AssignOwnerModal
          processId={assignModal.processId}
          processName={assignModal.processName}
          isOpen
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

function ProcessRow({
  process,
  getRegulationProcessOwner,
  getTeamMembersWithAuth,
  onAssign,
}: {
  process: ConfirmedProcess;
  getRegulationProcessOwner: (id: string) => string | undefined;
  getTeamMembersWithAuth: () => { id: string; name: string; role: string }[];
  onAssign: (processId: string, processName: string) => void;
}) {
  const ownerId = getRegulationProcessOwner(process.processId);
  const owner = ownerId
    ? getTeamMembersWithAuth().find((m) => m.id === ownerId)
    : undefined;

  return (
    <Link
      href={`/dashboard/processes/${process.slug}`}
      className="group grid grid-cols-1 gap-1 px-5 py-4 transition-colors hover:bg-gray-50 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4"
    >
      <div className="min-w-0">
        <p className="font-medium text-gray-900 group-hover:text-indigo-600">
          {process.title}
        </p>
      </div>

      <span className="hidden w-24 rounded-full bg-indigo-50 px-2 py-0.5 text-center text-xs font-medium text-indigo-700 sm:inline-block">
        {process.agency}
      </span>

      <span className="hidden w-36 text-sm text-gray-600 sm:block">
        {process.frequencyLabel || "—"}
      </span>

      <div
        className="hidden w-36 sm:block"
        onClick={(e) => {
          if (!owner) {
            e.preventDefault();
            e.stopPropagation();
            onAssign(process.processId, process.title);
          }
        }}
      >
        {owner ? (
          <span className="text-sm text-gray-700">{owner.name}</span>
        ) : (
          <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Unassigned
          </span>
        )}
      </div>

      <svg
        className="hidden h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 sm:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
