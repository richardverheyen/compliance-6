import { test, expect } from "@playwright/test";
import { clearAppStorage, signUp, activateAMLRegulation, uniqueEmail } from "./helpers";

test.describe("AML/CTF regulation selection and activation", () => {
  let testEmail: string;

  test.beforeEach(async ({ page }) => {
    testEmail = uniqueEmail();
    await clearAppStorage(page);
    await signUp(page, "Compliance Officer", testEmail, "password123");
  });

  test("AML/CTF Rules regulation appears in the regulations list", async ({ page }) => {
    await page.goto("/dashboard/regulations");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /AML\/CTF Rules/i })).toBeVisible();
    await expect(page.getByText("AUSTRAC")).toBeVisible();
  });

  test("clicking the AML/CTF card navigates to the regulation detail page", async ({ page }) => {
    await page.goto("/dashboard/regulations");
    await page.waitForLoadState("networkidle");

    // Click the regulation card link
    await page.getByRole("heading", { name: /AML\/CTF Rules/i }).click();

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

    await expect(page.getByRole("heading", { name: "Business Profile" })).toBeVisible();
    await expect(page.locator('label:has-text("Business Name") + input')).toBeVisible();
    await expect(page.locator('label:has-text("Location") + select')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scoping Questions" })).toBeVisible();
  });

  test("activates regulation with minimal scope (no customer types) and shows compliance forms", async ({
    page,
  }) => {
    await activateAMLRegulation(page, { customerTypes: [] });

    // State B: activation automatically creates the first assessment
    await expect(page.getByText("Assessment in progress")).toBeVisible();

    // Compliance Forms section renders the always-active forms
    await expect(page.getByRole("heading", { name: "Compliance Forms" })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Business Profile" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { name: "Business Profile" })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Begin Compliance Self-Assessment" }),
    ).toBeVisible();
  });
});
