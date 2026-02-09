export default function AboutPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900">About ComplianceIQ</h1>
        <div className="mt-8 space-y-6 text-gray-600 leading-7">
          <p>
            ComplianceIQ was founded with a simple mission: make compliance
            accessible and manageable for organizations of every size. We
            believe that staying compliant shouldn&apos;t require an army of
            consultants or endless spreadsheets.
          </p>
          <p>
            Our platform combines real-time regulatory monitoring, automated
            audit workflows, and AI-powered risk assessment into a single,
            intuitive dashboard. Whether you&apos;re a startup navigating your
            first SOC 2 audit or an enterprise managing compliance across dozens
            of jurisdictions, ComplianceIQ scales with you.
          </p>
          <p>
            Based in San Francisco, our team brings together expertise in
            regulatory technology, machine learning, and enterprise software. We
            serve hundreds of customers across financial services, healthcare,
            technology, and beyond.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">500+</p>
            <p className="mt-1 text-sm text-gray-600">Companies trust us</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">50+</p>
            <p className="mt-1 text-sm text-gray-600">Jurisdictions covered</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">99.9%</p>
            <p className="mt-1 text-sm text-gray-600">Uptime SLA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
