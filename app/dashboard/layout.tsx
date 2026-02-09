"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/legislations", label: "Legislations" },
  { href: "/dashboard/processes", label: "Business Processes" },
  { href: "/dashboard/team", label: "My Team" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-sm text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:block">
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile sub-nav */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-gray-200 bg-white md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              isActive(item.href)
                ? "text-indigo-600"
                : "text-gray-500"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
