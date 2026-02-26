"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useComplianceStore } from "@/lib/compliance-store";
import { SectionForm } from "@/components/compliance/SectionForm";
import { AssignOwnerModal } from "@/components/compliance/AssignOwnerModal";
import {
  getRegulationProcessForSlug,
  getProcessIdForSlug,
} from "@/mocks/compliance-data";
import type { RegulationProcess } from "@/lib/types/compliance";
import type { RegulationManifest, ProcessListEntry } from "@/lib/types/regulation-content";

export default function ProcessDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    activeRegulations,
    regulations,
    getRegulationProcessOwner,
    getTeamMembersWithAuth,
  } = useComplianceStore();

  const [manifest, setManifest] = useState<RegulationManifest | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Find the regulation that owns this slug
  const owningAr = activeRegulations.find((al) =>
    al.processes.some((p) => p.id === slug)
  );
  const regulationId = owningAr?.regulationId;
  const regulation = regulationId
    ? regulations.find((r) => r.id === regulationId)
    : undefined;

  // Fetch manifest for metadata (ProcessListEntry title/description)
  useEffect(() => {
    if (!regulationId) return;
    fetch(`/api/compliance/regulations/${regulationId}/manifest`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest);
  }, [regulationId]);

  const processEntry: ProcessListEntry | undefined = manifest?.processList.find(
    (p) => p.id === slug
  );

  // Metadata from catalog
  const regProcess: RegulationProcess | undefined = regulationId
    ? getRegulationProcessForSlug(slug, regulationId)
    : undefined;

  // Owner
  const processId = getProcessIdForSlug(slug);
  const ownerId = processId ? getRegulationProcessOwner(processId) : undefined;
  const owner = ownerId
    ? getTeamMembersWithAuth().find((m) => m.id === ownerId)
    : undefined;

  const title = processEntry?.title ?? slug;

  if (!regulationId) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/processes"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Business Processes
          </Link>
          <p className="mt-8 text-sm text-gray-500">Process not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard/processes"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Business Processes
          </Link>
          <span>/</span>
          <span className="text-gray-900">{title}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        {processEntry?.description && (
          <p className="mt-2 text-gray-600">{processEntry.description}</p>
        )}

        {/* Metadata card */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Agency */}
            {regulation && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Regulator
                </dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-medium text-indigo-700">
                    {regulation.agency}
                  </span>
                </dd>
              </div>
            )}

            {/* Jurisdiction */}
            {regulation && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Jurisdiction
                </dt>
                <dd className="mt-1 text-sm text-gray-700">{regulation.jurisdiction}</dd>
              </div>
            )}

            {/* Frequency */}
            {regProcess && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Frequency
                </dt>
                <dd className="mt-1 text-sm text-gray-700">{regProcess.frequencyLabel}</dd>
              </div>
            )}

            {/* Business Objective — full width */}
            {regProcess?.businessObjective && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Business Objective
                </dt>
                <dd className="mt-1 text-sm text-gray-700">{regProcess.businessObjective}</dd>
              </div>
            )}

            {/* Owner */}
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Owner
              </dt>
              <dd className="mt-1 flex items-center gap-3">
                {owner ? (
                  <>
                    <span className="text-sm text-gray-700">
                      {owner.name} &middot; {owner.role}
                    </span>
                    {processId && (
                      <button
                        onClick={() => setAssignModalOpen(true)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Change
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Unassigned — click to assign
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Read-only form */}
        <div className="mt-6">
          <SectionForm
            regulationId={regulationId}
            sectionId={slug}
            readOnly={true}
          />
        </div>
      </div>

      {assignModalOpen && processId && (
        <AssignOwnerModal
          processId={processId}
          processName={title}
          isOpen
          onClose={() => setAssignModalOpen(false)}
        />
      )}
    </div>
  );
}
