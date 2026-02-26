import Link from "next/link";

const features = [
  {
    title: "Regulation Self Assessments",
    description:
      "Step through structured, guided assessments mapped directly to regulatory frameworks. Know exactly where you stand against each obligation.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Business Process Management",
    description:
      "Document and manage the business processes tied to your compliance obligations. Keep your team aligned and your processes audit-ready.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    title: "Instant Compliance Reports",
    description:
      "Generate professional Executive Summaries and detailed Audit Reports as PDFs the moment your assessment is complete.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const steps = [
  { step: "1", title: "Activate a Regulation", description: "Select the regulations applicable to your business from our pre-built library of Australian compliance frameworks." },
  { step: "2", title: "Complete Your Assessment", description: "Work through each business process with guided questions. Your answers are saved as you go." },
  { step: "3", title: "Generate Your Report", description: "Export a professional Executive Summary or detailed Audit Report PDF instantly when your assessment is done." },
];

const testimonials = [
  {
    quote: "Valour Compliance gave us a clear, structured way to assess our AML-CTF obligations. What used to take weeks of back-and-forth now takes hours.",
    name: "Michelle Tran",
    title: "Chief Compliance Officer, Harbour Capital",
  },
  {
    quote: "The ability to generate a polished audit report the moment we finish our assessment has been invaluable for our board reporting cycle.",
    name: "David Okafor",
    title: "Head of Risk, Pacific Lending Group",
  },
  {
    quote: "Our compliance team finally has a single place to manage processes and track assessments. It's exactly what we needed.",
    name: "Sophie Marshall",
    title: "Legal & Compliance Manager, Crestview Financial",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-4 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Compliance self-assessments,{" "}
            <span className="text-indigo-600">done right</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Assess your business against Australian regulatory frameworks, manage your
            compliance processes, and generate audit-ready reports — all in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Get Started
            </Link>
            <Link
              href="/features"
              className="rounded-lg border border-indigo-600 px-6 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need to stay compliant
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Built by Australian compliance experts for Australian businesses.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 p-8 transition hover:shadow-lg"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Trusted by compliance teams across Australia
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-200 p-8"
              >
                <p className="text-sm leading-6 text-gray-600">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-indigo-600 px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-white">
            Ready to take control of your compliance?
          </h2>
          <p className="mt-4 text-indigo-100">
            Join Australian businesses using Valour Compliance to simplify their regulatory obligations.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
            >
              Get Started Free
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
