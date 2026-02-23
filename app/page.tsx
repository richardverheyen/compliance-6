import Link from "next/link";

const features = [
  {
    title: "Regulatory Tracking",
    description:
      "Stay on top of changing regulations across jurisdictions with real-time monitoring and alerts.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Automated Audits",
    description:
      "Run continuous compliance audits automatically and receive detailed reports without manual effort.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Risk Assessment",
    description:
      "Identify and prioritize compliance risks with AI-powered analysis and actionable recommendations.",
    icon: (
      <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
];

const steps = [
  { step: "1", title: "Connect", description: "Integrate your existing systems and data sources in minutes." },
  { step: "2", title: "Scan", description: "Our engine continuously scans for compliance gaps and violations." },
  { step: "3", title: "Report", description: "Get actionable reports and remediation steps delivered to your team." },
];

const testimonials = [
  {
    quote: "Valour Compliance cut our audit preparation time by 70%. It's a game-changer for our legal team.",
    name: "Sarah Chen",
    title: "VP of Compliance, Meridian Financial",
  },
  {
    quote: "We went from quarterly manual checks to continuous monitoring overnight. The ROI was immediate.",
    name: "James Rodriguez",
    title: "CTO, Apex Healthcare",
  },
  {
    quote: "Finally, a compliance tool that developers and compliance officers both love using.",
    name: "Emily Nakamura",
    title: "Head of Engineering, Stratos Inc.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-4 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Compliance validation,{" "}
            <span className="text-indigo-600">simplified</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Automate regulatory tracking, continuous audits, and risk assessment.
            Stay compliant without the manual burden.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Get Started
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-indigo-600 px-6 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need for compliance
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Purpose-built tools that make compliance manageable for teams of any size.
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
            Trusted by compliance teams everywhere
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
            Ready to streamline your compliance?
          </h2>
          <p className="mt-4 text-indigo-100">
            Join hundreds of teams that trust Valour Compliance to keep them compliant.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
            >
              Get Started Free
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
