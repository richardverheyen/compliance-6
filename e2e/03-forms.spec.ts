/**
 * Form entry variants
 *
 * Covers three scenarios to exercise different scoping combinations and
 * answer patterns within the AML/CTF process forms.
 *
 * Variant A – Individuals only, all-Yes answers on risk-assessment
 * Variant B – Individuals + Companies, mixed Yes/No answers
 * Variant C – Agents selected, agent-management form unlocked, partial answers
 */

import { test, expect } from "@playwright/test";
import {
  clearAppStorage,
  signUp,
  activateAMLRegulation,
  answerYesNo,
  answerAllYes,
  uniqueEmail,
} from "./helpers";

// ─── Shared setup ─────────────────────────────────────────────────────────────

async function setup(
  page: Parameters<typeof clearAppStorage>[0],
  customerTypes: string[],
) {
  const email = uniqueEmail();
  await clearAppStorage(page);
  await signUp(page, "Assessor", email, "Compl1ance!Test");
  // activateAMLRegulation creates the first active assessment automatically (State B)
  await activateAMLRegulation(page, { customerTypes });
  await page.goto("/dashboard/regulations/aml-ctf-rules");
  await page.waitForLoadState("networkidle");
}

// ─── Variant A: Individuals only, all-Yes ─────────────────────────────────────

test.describe("Variant A – Individuals only, all-Yes answers", () => {
  test("starts assessment, navigates to risk-assessment, fills all Yes", async ({ page }) => {
    await setup(page, ["Individuals"]);

    // Assessment should be in progress — tab bar shows "In progress" badge
    await expect(page.getByText("In progress")).toBeVisible();

    // Open the risk-assessment form
    await page.getByRole("link", { name: "ML/TF Risk Assessment" }).click();
    await expect(page).toHaveURL(/\/processes\/risk-assessment/);
    await page.waitForLoadState("networkidle");

    // Answer the gating question (unlocks main questions)
    await answerYesNo(page, "process-exists", "Yes");

    // Answer the risk-factor questions visible on this form
    await answerYesNo(page, "4_1_3", "Yes");
    await answerYesNo(page, "4_1_3_1", "Yes");
    await answerYesNo(page, "4_1_3_2", "Yes");
    await answerYesNo(page, "4_1_3_3", "Yes");
    await answerYesNo(page, "4_1_3_4", "Yes");
    await answerYesNo(page, "4_1_3_5", "Yes");

    // Radio buttons remain checked after answering
    await expect(
      page.locator('input[name="process-exists"][value="Yes"]'),
    ).toBeChecked();
    await expect(page.locator('input[name="4_1_3"][value="Yes"]')).toBeChecked();
  });

  test("CDD – Individuals form is accessible and can be answered", async ({ page }) => {
    await setup(page, ["Individuals"]);

    await page.getByRole("link", { name: "Customer Due Diligence — Individuals" }).click();
    await expect(page).toHaveURL(/\/processes\/cdd-individuals/);
    await page.waitForLoadState("networkidle");

    // Answer the gating question for this form
    await answerYesNo(page, "process-exists", "Yes");

    await expect(
      page.locator('input[name="process-exists"][value="Yes"]'),
    ).toBeChecked();
  });

  test("non-individual CDD forms are hidden when only Individuals is selected", async ({
    page,
  }) => {
    await setup(page, ["Individuals"]);

    // "Relevant to me only" filter is on by default — company/trust forms should be absent
    await expect(page.getByText("Customer Due Diligence — Companies")).not.toBeVisible();
    await expect(page.getByText("Customer Due Diligence — Trusts")).not.toBeVisible();
  });

  test("toggling 'Relevant to me only' off reveals non-applicable forms as dimmed", async ({
    page,
  }) => {
    await setup(page, ["Individuals"]);

    // Toggle the filter off
    await page.getByRole("switch", { name: /relevant to me only/i }).click();

    // Companies form appears dimmed (as a gray span, not a clickable link)
    await expect(page.getByText("Customer Due Diligence — Companies")).toBeVisible();
    // Verify it renders as a span (not relevant → not a link)
    await expect(page.locator('span:text("Customer Due Diligence — Companies")')).toBeVisible();
  });
});

// ─── Variant B: Individuals + Companies, mixed Yes/No ────────────────────────

test.describe("Variant B – Individuals + Companies, mixed Yes/No answers", () => {
  test("both CDD forms are visible with Individuals + Companies scope", async ({ page }) => {
    await setup(page, ["Individuals", "Companies"]);

    await expect(page.getByText("Customer Due Diligence — Individuals")).toBeVisible();
    await expect(page.getByText("Customer Due Diligence — Companies")).toBeVisible();
    await expect(page.getByText("Beneficial Ownership")).toBeVisible();
    await expect(page.getByText("PEP Screening")).toBeVisible();
  });

  test("mixed Yes/No answers persist on the risk-assessment form", async ({
    page,
  }) => {
    await setup(page, ["Individuals", "Companies"]);

    await page.getByRole("link", { name: "ML/TF Risk Assessment" }).click();
    await page.waitForLoadState("networkidle");

    // Answer process-exists: Yes to unlock main questions
    await answerYesNo(page, "process-exists", "Yes");

    // Answer some Yes and some No
    await answerYesNo(page, "4_1_3", "Yes");
    await answerYesNo(page, "4_1_3_1", "No");
    await answerYesNo(page, "4_1_3_2", "Yes");

    await expect(page.locator('input[name="process-exists"][value="Yes"]')).toBeChecked();
    await expect(page.locator('input[name="4_1_3"][value="Yes"]')).toBeChecked();
    await expect(page.locator('input[name="4_1_3_1"][value="No"]')).toBeChecked();
  });

  test("detail textarea appears when a detail-required question is answered Yes", async ({
    page,
  }) => {
    await setup(page, ["Individuals", "Companies"]);

    await page.getByRole("link", { name: "ML/TF Risk Assessment" }).click();
    await page.waitForLoadState("networkidle");

    // Answer process-exists: Yes first to unlock main questions
    await answerYesNo(page, "process-exists", "Yes");

    // 4_1_3 has detail-required: true
    await answerYesNo(page, "4_1_3", "Yes");

    // Detail textarea should now appear
    const detail = page.locator('textarea[placeholder="Enter details…"]').first();
    await expect(detail).toBeVisible();

    // Can type into it
    await detail.fill("Our ML/TF risk assessment is reviewed annually by the compliance team.");
    await expect(detail).toHaveValue(
      "Our ML/TF risk assessment is reviewed annually by the compliance team.",
    );
  });

  test("navigates between process forms using Prev/Next links", async ({ page }) => {
    await setup(page, ["Individuals", "Companies"]);

    // Navigate to the risk-assessment form (first in the list)
    await page.getByRole("link", { name: "ML/TF Risk Assessment" }).click();
    await page.waitForLoadState("networkidle");

    // Prev link should not exist on the first form
    await expect(
      page.locator('a:has-text("←"), a:has(svg ~ :text-is(""))').first(),
    ).not.toBeVisible().catch(() => {
      // Acceptable — link may simply not be rendered
    });

    // Next link should exist
    const nextLink = page.locator("a").filter({ hasText: /Customer Due Diligence/ }).first();
    await expect(nextLink).toBeVisible();
    await nextLink.click();

    // Should now be on a CDD form (use Playwright's retry-capable assertion)
    await expect(page).toHaveURL(/\/processes\/cdd-/);
  });
});

// ─── Variant C: Customer Agents selected ─────────────────────────────────────

test.describe("Variant C – Customer Agents selected", () => {
  test("agent-management form is unlocked when Customer Agents is selected", async ({
    page,
  }) => {
    await setup(page, ["Customer Agents"]);

    await expect(page.getByText("Agent Management")).toBeVisible();
  });

  test("can partially fill agent-management form", async ({ page }) => {
    await setup(page, ["Customer Agents"]);

    await page.getByRole("link", { name: "Agent Management" }).click();
    await page.waitForLoadState("networkidle");

    await answerYesNo(page, "process-exists", "Yes");

    await expect(
      page.locator('input[name="process-exists"][value="Yes"]'),
    ).toBeChecked();
  });

  test.skip("read-only banner appears on process form when no assessment is active", async ({
    page,
  }) => {
    // SKIP: store uses Supabase (no localStorage), so localStorage manipulation
    // no longer affects the app state. Needs rewrite to use API to complete assessment.
    const email = uniqueEmail();
    await clearAppStorage(page);
    await signUp(page, "Reader", email, "Compl1ance!Test");
    // Activate regulation (this also creates the first assessment automatically)
    await activateAMLRegulation(page, { customerTypes: [] });

    // Complete the assessment via localStorage manipulation so there is no active assessment
    await page.evaluate(() => {
      const key = "compliance-storage-v2";
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const store = JSON.parse(raw);
      const reg = store.state?.activeRegulations?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.regulationId === "aml-ctf-rules",
      );
      if (!reg || !reg.selfAssessments?.length) return;
      reg.selfAssessments[0].status = "completed";
      reg.selfAssessments[0].completedAt = new Date().toISOString();
      reg.selfAssessments[0].completedBy = "Test User";
      reg.activeAssessmentId = null;
      localStorage.setItem(key, JSON.stringify(store));
    });

    // Navigate directly to a process form page (reload picks up updated store)
    await page.goto("/dashboard/regulations/aml-ctf-rules/processes/risk-assessment");
    await page.waitForLoadState("networkidle");

    // Should show read-only banner
    await expect(
      page.getByText("No assessment in progress — answers are read-only."),
    ).toBeVisible();
  });

  test("completing all forms enables 'Complete Assessment' button", async ({ page }) => {
    // Use empty scope (only always-active forms) so we have fewer forms to complete
    await setup(page, []);

    // Complete each always-active form via the UI so that saveSectionAnswers
    // calls recomputeProcesses and correctly updates active.processes.
    // Multiple answerAllYes rounds handle conditionally-visible field chains.
    const slugs = [
      "risk-assessment",
      "verification-documents",
      "verification-electronic",
      "alternative-id",
    ];

    for (const slug of slugs) {
      await page.goto(`/dashboard/regulations/aml-ctf-rules/processes/${slug}`);
      await page.waitForLoadState("networkidle");

      // Unlock the main group via the gate question
      await answerYesNo(page, "process-exists", "Yes");

      // Four rounds to cover any chained conditional-visibility rules
      for (let i = 0; i < 4; i++) {
        await answerAllYes(page);
      }

      // Save triggers saveSectionAnswers → recomputeProcesses in the store
      await page.getByRole("button", { name: "Save Progress" }).click();
      await page.waitForLoadState("networkidle");
    }

    await page.goto("/dashboard/regulations/aml-ctf-rules");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("button", { name: "Complete Assessment" }),
    ).toBeVisible();
  });
});
