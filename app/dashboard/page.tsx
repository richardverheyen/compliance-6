"use client";

import { useAuthStore } from "@/lib/auth-store";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Compliance Score</p>
            <p className="mt-2 text-3xl font-bold text-green-600">94%</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Open Issues</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">7</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Audits This Month</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">3</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Regulations Tracked</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">24</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            {[
              { action: "SOC 2 audit completed", time: "2 hours ago", status: "Passed" },
              { action: "New GDPR regulation detected", time: "5 hours ago", status: "Review needed" },
              { action: "Risk assessment updated", time: "1 day ago", status: "3 new risks" },
              { action: "Policy document approved", time: "2 days ago", status: "Approved" },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
