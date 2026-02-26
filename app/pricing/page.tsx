import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$99",
    description: "For small teams beginning their compliance journey.",
    features: [
      "Up to 5 users",
      "1 active regulation",
      "Self assessment workflows",
      "Business process management",
      "PDF report generation",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "$299",
    description: "For growing teams managing multiple regulatory obligations.",
    features: [
      "Up to 25 users",
      "Up to 5 active regulations",
      "Self assessment workflows",
      "Business process management",
      "PDF report generation",
      "Assessment history & comparison",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For larger organisations with complex compliance needs.",
    features: [
      "Unlimited users",
      "Unlimited regulations",
      "Self assessment workflows",
      "Business process management",
      "PDF report generation",
      "Assessment history & comparison",
      "Dedicated account manager",
      "Custom regulation frameworks",
      "SLA guarantee",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Pricing</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Simple, transparent pricing for teams of every size.
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-8 ${
                plan.highlighted
                  ? "border-indigo-600 ring-2 ring-indigo-600"
                  : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              <p className="mt-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="text-sm text-gray-500">/month</span>
                )}
              </p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 block rounded-lg px-4 py-2 text-center text-sm font-semibold ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {plan.price === "Custom" ? "Contact Us" : "Get Started"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
