/**
 * Auth E2E tests — Clerk + org onboarding
 *
 * Tests the authentication and onboarding flow:
 * - Unauthenticated redirects
 * - Sign-up → email OTP (Clerk dev +clerk_test magic code 424242) → org setup → /dashboard
 * - /onboarding accessible only when authenticated
 */
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { clearAppStorage, signUp, uniqueEmail } from "./helpers";

/**
 * Submit Clerk's sign-up form.
 * Requires setupClerkTestingToken to have been called first on the page.
 * Handles OTP if it appears (using Clerk dev magic code 424242 with +clerk_test emails).
 * Stops after the OTP step — does NOT complete org setup.
 */
async function submitSignUpForm(page: Parameters<typeof clearAppStorage>[0], email: string) {
  await page.fill('input[name="firstName"]', "Test");
  await page.fill('input[name="emailAddress"]', email);
  await page.fill('input[name="password"]', "Compl1ance!Test");
  // force:true bypasses Next.js dev overlay portal which intercepts pointer events in dev mode
  await page.getByRole("button", { name: "Continue" }).click({ force: true });

  // After "Continue", wait for OTP input or next step (sign-up task / onboarding / dashboard)
  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  await Promise.race([
    page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 30_000 }),
    otpInput.waitFor({ state: "visible", timeout: 30_000 }),
  ]);

  if (!page.url().match(/sign-up\/tasks|onboarding|dashboard/)) {
    // OTP appeared — fill with Clerk dev magic code (requires +clerk_test email suffix)
    await otpInput.fill("424242");
    await page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 20_000 });
  }
}

test.describe("Auth — unauthenticated redirects", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test("unauthenticated user visiting /dashboard is redirected to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/sign-in/, { timeout: 15_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("unauthenticated user visiting /onboarding is redirected to sign-in", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/sign-in/, { timeout: 15_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("sign-in page renders a form", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk's hosted pages keep persistent connections — use "load" not "networkidle"
    await page.waitForLoadState("load");
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("sign-up page renders a form", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("load");
    await expect(page.locator("form").first()).toBeVisible();
  });
});

test.describe("Auth — sign-up and onboarding flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test("new sign-up goes through org setup before reaching /dashboard", async ({ page }) => {
    const email = uniqueEmail();
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");
    await page.waitForURL(/sign-up/, { timeout: 15_000 });
    await submitSignUpForm(page, email);
    // After OTP, Clerk routes to org setup task or onboarding
    expect(page.url()).toMatch(/sign-up\/tasks|onboarding/);
  });

  test("org setup step shows an org name field and continue button", async ({ page }) => {
    const email = uniqueEmail();
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");
    await page.waitForURL(/sign-up/, { timeout: 15_000 });
    await submitSignUpForm(page, email);

    await page.waitForLoadState("load");

    if (page.url().includes("sign-up/tasks")) {
      // Clerk's native org setup task
      await expect(page.getByLabel("Name")).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    } else {
      // Custom /onboarding page
      await expect(page.getByLabel(/organization name/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /create organization/i })).toBeVisible();
    }
  });

  test("completing org setup redirects to /dashboard", async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, "Onboarding User", email, "Compl1ance!Test");
    await expect(page).toHaveURL("/dashboard");
  });
});
