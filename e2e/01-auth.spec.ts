/**
 * Auth E2E tests — Clerk migration
 *
 * Authentication is now handled by Clerk. These tests need to be rewritten
 * using @clerk/testing/playwright with setupClerkTestingToken() for
 * programmatic authentication in E2E tests.
 *
 * See: https://clerk.com/docs/testing/playwright/overview
 *
 * TODO: Install @clerk/testing and configure CLERK_SECRET_KEY + test user
 * credentials to re-enable these tests.
 */
import { test, expect } from "@playwright/test";
import { clearAppStorage } from "./helpers";

test.describe("Auth (Clerk)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test("unauthenticated user is redirected to sign-in when visiting /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/sign-in/, { timeout: 15_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("sign-in page is accessible", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    // Clerk renders a sign-in form
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("sign-up page is accessible", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    // Clerk renders a sign-up form
    await expect(page.locator("form").first()).toBeVisible();
  });
});
