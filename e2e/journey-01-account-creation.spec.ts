/**
 * User Journey 1: Create a new account from the homepage
 *
 * Starts at the homepage, clicks "Get Started" in the navbar, completes the
 * Clerk sign-up form (including the org-setup step), and lands on /dashboard.
 *
 * Video is always recorded for this journey (use test.use({ video: 'on' })).
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { clearAppStorage, uniqueEmail } from "./helpers";

// Always record video so the full journey is captured, even on success.
test.use({ video: "on" });

test("Journey 1 — Create new account from homepage", async ({ page }) => {
  const email = uniqueEmail();
  await clearAppStorage(page);
  // Must be called before the first navigation so Clerk's dev-mode OTP bypass
  // is in place for all subsequent requests on this page context.
  await setupClerkTestingToken({ page });

  // ── Step 1: Land on the homepage ─────────────────────────────────────────
  await page.goto("/");
  await page.waitForLoadState("load");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // ── Step 2: Click "Get Started" in the marketing navbar ──────────────────
  // The marketing Navbar renders "Get Started" (→ /sign-up) only after Clerk
  // hydrates and determines the signed-out state. Wait for the specific href
  // to avoid accidentally clicking the hero's /signup link (a 404).
  await page.locator('a[href="/sign-up"]').first().waitFor({ state: "visible", timeout: 15_000 });
  await page.locator('a[href="/sign-up"]').first().click();
  await page.waitForURL(/sign-up/, { timeout: 15_000 });
  await page.waitForLoadState("load");

  // ── Step 3: Fill in the Clerk sign-up form ────────────────────────────────
  await page.fill('input[name="firstName"]', "Jane");
  await page.fill('input[name="lastName"]', "Smith");
  await page.fill('input[name="emailAddress"]', email);
  await page.fill('input[name="password"]', "Compl1ance!Test");
  // force: true bypasses the Next.js dev-overlay portal that intercepts clicks.
  await page.getByRole("button", { name: "Continue" }).click({ force: true });

  // ── Step 4: Handle email OTP if it appears ────────────────────────────────
  // Clerk sends a one-time code when email verification is enabled.
  // +clerk_test email suffix allows the magic code 424242 in dev mode.
  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  await Promise.race([
    page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 30_000 }),
    otpInput.waitFor({ state: "visible", timeout: 30_000 }),
  ]);
  if (!page.url().match(/sign-up\/tasks|onboarding|dashboard/)) {
    await otpInput.fill("424242");
    await page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 20_000 });
  }

  // ── Step 5: Org setup ─────────────────────────────────────────────────────
  // Clerk routes new users through an org-creation step before /dashboard.
  await page.waitForLoadState("load");
  if (page.url().includes("sign-up/tasks")) {
    // Clerk's native org setup task (renders inside the sign-up flow)
    const nameInput = page.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill("Acme Legal Partners");
    await page.getByRole("button", { name: "Continue" }).click({ force: true });
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  } else if (page.url().includes("onboarding")) {
    // Custom /onboarding fallback
    await page.getByLabel(/organization name/i).fill("Acme Legal Partners");
    await page.getByRole("button", { name: /create organization/i }).click({ force: true });
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  }

  // ── Step 6: Confirm arrival at the dashboard ──────────────────────────────
  // Clerk keeps persistent connections so networkidle never fires; "load" is enough.
  await expect(page).toHaveURL(/dashboard/);
  await page.waitForLoadState("load");
});
