"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Valour Compliance
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              About
            </Link>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <SignedIn>
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </SignedOut>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/features" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>Pricing</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>About</Link>
            <SignedIn>
              <Link href="/dashboard" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in" className="text-sm font-medium text-gray-600" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link href="/sign-up" className="text-sm font-medium text-indigo-600" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </SignedOut>
          </div>
        </div>
      )}
    </nav>
  );
}
