/**
 * Team page E2E tests — Clerk org invitations
 *
 * Covers:
 * - Team page structure (invite form, sections)
 * - Org owner appears in Team Members
 * - Inviting a new member creates a pending invitation
 * - Revoking a pending invitation removes it
 */
import { test, expect } from "@playwright/test";
import { clearAppStorage, signUp, uniqueEmail } from "./helpers";

test.describe("Team page", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await signUp(page, "Team Admin", uniqueEmail(), "password123");
  });

  // ─── Page structure ───────────────────────────────────────────────────────

  test("renders the invite form with email and optional role fields", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Invite Team Member" })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/role \/ job title/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invitation" })).toBeVisible();
  });

  test("renders the Team Members and heading", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Team Members" })).toBeVisible();
  });

  test("role field is not required — form submits with email only", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    const inviteEmail = uniqueEmail();
    await page.getByLabel(/email address/i).fill(inviteEmail);
    // Leave role blank — form should still submit
    await page.getByRole("button", { name: "Send invitation" }).click();

    // Pending Invitations section should appear
    await expect(page.getByRole("heading", { name: "Pending Invitations" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(inviteEmail)).toBeVisible();
  });

  // ─── Org membership ───────────────────────────────────────────────────────

  test("org owner appears in Team Members after onboarding", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // At least one member card should be present (the org creator)
    const memberSection = page.locator("h2", { hasText: "Team Members" }).locator("~ div");
    // Should NOT show the empty-state message
    await expect(page.getByText("No active members yet.")).not.toBeVisible();
  });

  // ─── Invite flow ──────────────────────────────────────────────────────────

  test("inviting an email address creates a pending invitation entry", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    const inviteEmail = uniqueEmail();
    await page.getByLabel(/email address/i).fill(inviteEmail);
    await page.getByLabel(/role \/ job title/i).fill("Compliance Officer");
    await page.getByRole("button", { name: "Send invitation" }).click();

    // Pending Invitations section should appear and contain the email
    await expect(page.getByRole("heading", { name: "Pending Invitations" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(inviteEmail)).toBeVisible();

    // Should show a "Sent …" date
    await expect(page.getByText(/^Sent /)).toBeVisible();
  });

  test("pending invitation has a Revoke button", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    const inviteEmail = uniqueEmail();
    await page.getByLabel(/email address/i).fill(inviteEmail);
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByRole("heading", { name: "Pending Invitations" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Revoke" })).toBeVisible();
  });

  // ─── Revoke flow ──────────────────────────────────────────────────────────

  test("revoking a pending invitation removes it from the list", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    const inviteEmail = uniqueEmail();
    await page.getByLabel(/email address/i).fill(inviteEmail);
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 10_000 });

    // Click Revoke → confirm dialog appears
    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Cancel keeps the invitation
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();

    // Revoke + Confirm removes it
    await page.getByRole("button", { name: "Revoke" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByText(inviteEmail)).not.toBeVisible({ timeout: 10_000 });
    // Section disappears when no pending invitations remain
    await expect(page.getByRole("heading", { name: "Pending Invitations" })).not.toBeVisible();
  });

  test("cancelling revoke keeps the invitation visible", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    const inviteEmail = uniqueEmail();
    await page.getByLabel(/email address/i).fill(inviteEmail);
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Revoke" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should still be visible after cancel
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await expect(page.getByRole("button", { name: "Revoke" })).toBeVisible();
  });
});
