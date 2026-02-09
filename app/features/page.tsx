import Link from "next/link";

const features = [
  {
    title: "Regulatory Tracking",
    description:
      "Monitor regulatory changes across 50+ jurisdictions in real time. Get alerts when new rules affect your business.",
  },
  {
    title: "Automated Audits",
    description:
      "Schedule and run compliance audits automatically. Generate detailed audit trails and reports with one click.",
  },
  {
    title: "Risk Assessment",
    description:
      "AI-powered risk scoring identifies your highest-priority compliance gaps and recommends remediation steps.",
  },
  {
    title: "Policy Management",
    description:
      "Centralize all compliance policies. Track versions, approvals, and attestations in one place.",
  },
  {
    title: "Team Collaboration",
    description:
      "Assign tasks, track progress, and collaborate across legal, engineering, and operations teams.",
  },
  {
    title: "Reporting & Analytics",
    description:
      "Executive dashboards and exportable reports for board meetings, auditors, and regulators.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Features</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Everything your team needs to stay compliant, in one platform.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
