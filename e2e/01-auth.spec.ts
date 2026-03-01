/**
 * Auth E2E tests — Clerk + org onboarding
 *
 * Tests the authentication and onboarding flow:
 * - Unauthenticated redirects
 * - Sign-up → /onboarding → org creation → /dashboard
 * - /onboarding accessible only when authenticated
 *
 * NOTE: sign-up tests require a Clerk dev account with email verification
 * disabled (or a passwordless/magic-link flow bypassed). For full CI coverage
 * use @clerk/testing/playwright with setupClerkTestingToken().
 */
import { test, expect } from "@playwright/test";
import { clearAppStorage, signUp, uniqueEmail } from "./helpers";

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
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("sign-up page renders a form", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form").first()).toBeVisible();
  });
});

test.describe("Auth — sign-up and onboarding flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test("new sign-up redirects to /onboarding before /dashboard", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/sign-up");
    await page.waitForURL(/sign-up/, { timeout: 15_000 });

    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="emailAddress"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Should land on /onboarding — NOT /dashboard directly
    await page.waitForURL(/onboarding/, { timeout: 20_000 });
    expect(page.url()).toContain("onboarding");
  });

  test("/onboarding shows the CreateOrganization form", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/sign-up");
    await page.waitForURL(/sign-up/, { timeout: 15_000 });

    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="emailAddress"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL(/onboarding/, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // Clerk's <CreateOrganization> renders an org name input
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create organization/i })).toBeVisible();
  });

  test("completing org creation at /onboarding redirects to /dashboard", async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, "Onboarding User", email, "password123");

    // signUp() completes the full flow — should end at /dashboard
    await expect(page).toHaveURL("/dashboard");
  });
});
