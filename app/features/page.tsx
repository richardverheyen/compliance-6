import Link from "next/link";

const features = [
  {
    title: "Regulation Self Assessments",
    description:
      "Conduct structured self-assessments against Australian regulatory frameworks. Each assessment guides you through your obligations section by section, so nothing gets missed.",
  },
  {
    title: "Regulation Library",
    description:
      "Pre-built assessment frameworks for key Australian regulations including the AML-CTF Rules and the Privacy Act 1988, maintained by our compliance experts.",
  },
  {
    title: "Business Process Management",
    description:
      "Define and document the business processes relevant to your regulatory obligations. Link processes to specific regulations to keep your compliance posture clear.",
  },
  {
    title: "PDF Report Generation",
    description:
      "Generate a professional Executive Summary or a detailed Audit Report at the click of a button. Share with your board, auditors, or regulators with confidence.",
  },
  {
    title: "Compliance Dashboard",
    description:
      "See the status of all your active regulations in one view. Track in-progress assessments, review completed ones, and understand your overall compliance position.",
  },
  {
    title: "Assessment History",
    description:
      "Keep a full record of past assessments. Compare results over time to demonstrate continuous improvement and maintain a defensible compliance trail.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Features</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Purpose-built tools to help Australian businesses manage their regulatory compliance with confidence.
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
