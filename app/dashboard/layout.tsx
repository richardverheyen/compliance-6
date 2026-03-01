"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useComplianceStore } from "@/lib/compliance-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/regulations", label: "Regulations" },
  { href: "/dashboard/processes", label: "Business Processes" },
  { href: "/dashboard/team", label: "My Team" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { initialize } = useComplianceStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Valour Compliance
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <UserButton />
          </div>
        </div>

        {/* Mobile: horizontally scrollable nav links */}
        <div className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
