import { test, expect } from "@playwright/test";
import { clearAppStorage, signUp, activateAMLRegulation, uniqueEmail } from "./helpers";

test.describe("AML/CTF regulation selection and activation", () => {
  let testEmail: string;

  test.beforeEach(async ({ page }) => {
    testEmail = uniqueEmail();
    await clearAppStorage(page);
    await signUp(page, "Compliance Officer", testEmail, "Compl1ance!Test");
  });

  test("AML/CTF Rules regulation appears in the regulations list", async ({ page }) => {
    await page.goto("/dashboard/regulations");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /AML\/CTF Rules/i })).toBeVisible();
    // AUSTRAC appears as a label in the card; use first() since it also appears in description text
    await expect(page.getByText("AUSTRAC").first()).toBeVisible();
  });

  test("clicking the AML/CTF card navigates to the regulation detail page", async ({ page }) => {
    await page.goto("/dashboard/regulations");
    await page.waitForLoadState("networkidle");

    // Click the regulation card (it's a full-card link wrapping the heading)
    await page.getByRole("link", { name: /AML\/CTF Rules/ }).first().click();

    await expect(page).toHaveURL(/\/dashboard\/regulations\/aml-ctf-rules/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Anti-Money Laundering and Counter-Terrorism Financing",
    );
  });

  test("detail page shows 'Begin Compliance Self-Assessment' for unactivated regulation", async ({
    page,
  }) => {
    await page.goto("/dashboard/regulations/aml-ctf-rules");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: "Begin Compliance Self-Assessment" }),
    ).toBeVisible();
  });

  test("activation form appears after clicking 'Begin Compliance Self-Assessment'", async ({
    page,
  }) => {
    await page.goto("/dashboard/regulations/aml-ctf-rules");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Begin Compliance Self-Assessment" }).click();

    await expect(page.getByRole("heading", { name: "Scoping Questions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activate Compliance Tracking" })).toBeVisible();
  });

  test("activates regulation with minimal scope (no customer types) and shows compliance forms", async ({
    page,
  }) => {
    await activateAMLRegulation(page, { customerTypes: [] });

    // State B: tab bar shows "#1 In progress" tab
    await expect(page.getByText("In progress")).toBeVisible();

    // Compliance Assessment section renders the always-active forms
    await expect(page.getByRole("heading", { name: "Compliance Assessment" })).toBeVisible();
    await expect(page.getByText("ML/TF Risk Assessment")).toBeVisible();
  });

  test("activates with 'Individuals' customer type and shows cdd-individuals form", async ({
    page,
  }) => {
    await activateAMLRegulation(page, { customerTypes: ["Individuals"] });

    // The gated CDD form for individuals should now appear
    await expect(page.getByText("Customer Due Diligence — Individuals")).toBeVisible();
  });

  test("activating with 'Companies' triggers beneficial-ownership and pep-screening forms", async ({
    page,
  }) => {
    await activateAMLRegulation(page, { customerTypes: ["Companies"] });

    await expect(page.getByText("Customer Due Diligence — Companies")).toBeVisible();
    // Companies → derived 4_1_5_1 (beneficial ownership) and 4_1_5_2 (PEP screening)
    await expect(page.getByText("Beneficial Ownership")).toBeVisible();
    await expect(page.getByText("PEP Screening")).toBeVisible();
  });

  test("Cancel button hides activation form", async ({ page }) => {
    await page.goto("/dashboard/regulations/aml-ctf-rules");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Begin Compliance Self-Assessment" }).click();
    await expect(page.getByRole("heading", { name: "Scoping Questions" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { name: "Scoping Questions" })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Begin Compliance Self-Assessment" }),
    ).toBeVisible();
  });

  test("tab bar shows '#1 In progress' tab after activation", async ({ page }) => {
    await activateAMLRegulation(page, { customerTypes: [] });

    // The tab bar renders a button for assessment #1 with an "In progress" badge
    const tab = page.locator("button").filter({ hasText: "#1" }).filter({ hasText: "In progress" });
    await expect(tab).toBeVisible();

    // The active tab has the indigo border class
    await expect(tab).toHaveClass(/border-indigo-600/);
  });

  test("delete assessment shows inline confirmation and cancelling keeps the assessment", async ({
    page,
  }) => {
    await activateAMLRegulation(page, { customerTypes: [] });

    // Delete button is in the tab panel footer
    await expect(page.getByRole("button", { name: "Delete assessment" })).toBeVisible();

    // Click delete → inline confirmation appears
    await page.getByRole("button", { name: "Delete assessment" }).click();
    await expect(page.getByText("Delete this assessment?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Yes, delete" })).toBeVisible();

    // Cancelling dismisses the confirmation without deleting
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Delete this assessment?")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Delete assessment" })).toBeVisible();
  });

  test("confirming delete removes the assessment and returns to empty state", async ({ page }) => {
    await activateAMLRegulation(page, { customerTypes: [] });

    await page.getByRole("button", { name: "Delete assessment" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();

    // After deletion, regulation is still active but has no assessments (State C)
    await expect(
      page.getByRole("button", { name: "Start your first Self Assessment" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("In progress")).not.toBeVisible();
  });
});
