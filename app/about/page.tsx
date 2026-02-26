export default function AboutPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900">About Valour Compliance</h1>
        <div className="mt-8 space-y-6 text-gray-600 leading-7">
          <p>
            Valour Compliance was founded on a simple belief: businesses shouldn&apos;t
            need an army of consultants to understand and demonstrate their regulatory
            obligations. We built a platform that makes compliance self-assessment
            structured, repeatable, and audit-ready.
          </p>
          <p>
            Our platform gives organisations a clear framework to assess themselves
            against Australian regulatory requirements, manage the business processes
            tied to those obligations, and generate professional reports for their
            board, auditors, and regulators — all without the paperwork.
          </p>
          <p>
            Based in Sydney, Australia, our team brings deep expertise in Australian
            regulatory compliance across financial services, privacy, and beyond. We
            know the frameworks our customers are assessed against because we&apos;ve
            worked in and around them for years.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">Sydney</p>
            <p className="mt-1 text-sm text-gray-600">Based in Australia</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">Australian</p>
            <p className="mt-1 text-sm text-gray-600">Regulations supported</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">Expert</p>
            <p className="mt-1 text-sm text-gray-600">Compliance team</p>
          </div>
        </div>
      </div>
    </div>
  );
}
