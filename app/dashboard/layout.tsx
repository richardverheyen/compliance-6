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
    <div className="flex h-screen overflow-hidden flex-col">
      <nav className="border-b border-gray-200 bg-white">
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
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Organisation Settings"
                  labelIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M6.955 1.45A.5.5 0 0 1 7.452 1h1.096a.5.5 0 0 1 .497.45l.17 1.699c.484.12.94.312 1.354.564l1.34-.849a.5.5 0 0 1 .633.065l.775.775a.5.5 0 0 1 .065.633l-.849 1.34c.252.414.443.87.563 1.354l1.7.17a.5.5 0 0 1 .45.497v1.096a.5.5 0 0 1-.45.497l-1.699.17c-.12.484-.312.94-.564 1.354l.849 1.34a.5.5 0 0 1-.065.633l-.775.775a.5.5 0 0 1-.633.065l-1.34-.849c-.414.252-.87.443-1.354.563l-.17 1.7a.5.5 0 0 1-.497.45H7.452a.5.5 0 0 1-.497-.45l-.17-1.699a4.973 4.973 0 0 1-1.354-.564l-1.34.849a.5.5 0 0 1-.633-.065l-.775-.775a.5.5 0 0 1-.065-.633l.849-1.34A4.973 4.973 0 0 1 2.904 8.43l-1.7-.17A.5.5 0 0 1 .75 7.763V6.667a.5.5 0 0 1 .45-.497l1.699-.17c.12-.484.312-.94.564-1.354l-.849-1.34a.5.5 0 0 1 .065-.633l.775-.775a.5.5 0 0 1 .633-.065l1.34.849A4.973 4.973 0 0 1 6.784 3.15l.17-1.699ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" />
                    </svg>
                  }
                  href="/dashboard/settings"
                />
              </UserButton.MenuItems>
            </UserButton>
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
          <Link
            href="/dashboard/settings"
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive("/dashboard/settings")
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Settings
          </Link>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
