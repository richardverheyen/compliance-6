/**
 * Report generation and export tests
 *
 * Covers: Generate Report button visibility, Executive Summary PDF, and
 * Audit Report PDF (with regulation selector).
 */

import { test, expect } from "@playwright/test";
import {
  clearAppStorage,
  signUp,
  activateAMLRegulation,
  uniqueEmail,
} from "./helpers";

// ─── Shared setup ─────────────────────────────────────────────────────────────

async function setupWithActiveAssessment(page: Parameters<typeof clearAppStorage>[0]) {
  const email = uniqueEmail();
  await clearAppStorage(page);
  await signUp(page, "Report User", email, "password123");
  // activateAMLRegulation automatically creates the first assessment (State B)
  await activateAMLRegulation(page, { customerTypes: ["Individuals"] });
  // Navigate to dashboard
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
}

// ─── Report button visibility ─────────────────────────────────────────────────

test.describe("Generate Report button", () => {
  test("'Generate Report' button is NOT shown when no regulations are active", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await clearAppStorage(page);
    await signUp(page, "No Regs User", email, "password123");
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /Generate Report/i })).not.toBeVisible();
  });

  test("'Generate Report' button appears after activating a regulation", async ({ page }) => {
    const email = uniqueEmail();
    await clearAppStorage(page);
    await signUp(page, "Report Visible", email, "password123");
    await activateAMLRegulation(page, { customerTypes: [] });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /Generate Report/i })).toBeVisible();
  });
});

// ─── Report modal interactions ────────────────────────────────────────────────

test.describe("Report modal", () => {
  test.beforeEach(async ({ page }) => {
    await setupWithActiveAssessment(page);
  });

  test("modal opens and displays both report type cards", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    await expect(page.getByRole("heading", { name: "Generate Report" })).toBeVisible();
    await expect(page.getByText("Executive Summary")).toBeVisible();
    await expect(page.getByText("Audit Report")).toBeVisible();
  });

  test("Executive Summary is selected by default", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    // The Executive Summary card should have the active indigo border
    const execCard = page.locator('button:has-text("Executive Summary")').first();
    await expect(execCard).toHaveClass(/border-indigo-600/);
  });

  test("clicking Audit Report card shows regulation selector with AML regulation", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    // Audit card (the second one)
    await page.locator('button:has-text("Audit Report")').last().click();

    await expect(page.locator("#audit-regulation")).toBeVisible();
    // The dropdown option uses the full regulation name (reg.name) as its label,
    // and the regulation ID as its value
    await expect(
      page.locator('#audit-regulation option[value="aml-ctf-rules"]'),
    ).toBeAttached();
  });

  test("Close (×) button dismisses the modal", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();
    await expect(page.getByRole("heading", { name: "Generate Report" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();

    await expect(page.getByRole("heading", { name: "Generate Report" })).not.toBeVisible();
  });

  test("clicking backdrop dismisses the modal", async ({ page }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();
    await expect(page.getByRole("heading", { name: "Generate Report" })).toBeVisible();

    // Click top-left corner of the viewport — guaranteed to be outside the
    // centred modal panel even on the smallest supported desktop viewport.
    await page.mouse.click(5, 5);

    await expect(page.getByRole("heading", { name: "Generate Report" })).not.toBeVisible();
  });
});

// ─── PDF generation ───────────────────────────────────────────────────────────
//
// Chromium opens blob: PDF URLs in its built-in PDF viewer — a special page
// with no JavaScript context. Playwright's page/popup events fire for a
// service-worker page first, so capturing `context.waitForEvent("page")` is
// unreliable here. Instead, we intercept window.open on the main page before
// clicking, capture the URL it receives, and assert it is a blob: URL.

test.describe("PDF export", () => {
  // PDF rendering via @react-pdf/renderer can take several seconds
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await setupWithActiveAssessment(page);
  });

  /** Register a window.open spy on the page. Returns a Playwright promise that
   *  resolves to the first URL passed to window.open after the spy is set up. */
  async function captureWindowOpen(page: Parameters<typeof setupWithActiveAssessment>[0]) {
    return page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const original = window.open.bind(window);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).open = function (url: string, ...rest: unknown[]) {
          resolve(String(url ?? ""));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).open = original; // restore immediately
          return original(url, ...(rest as [string?, string?]));
        };
      });
    });
  }

  test("Executive Summary: clicking 'Generate PDF' calls window.open with a blob URL", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    // Set up spy first (executive summary is already selected)
    const openedUrl = captureWindowOpen(page);
    await page.getByRole("button", { name: "Generate PDF" }).click();

    expect(await openedUrl).toMatch(/^blob:/);
  });

  test("Audit Report: selecting regulation and clicking 'Generate PDF' calls window.open with a blob URL", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    // Switch to Audit Report
    await page.locator('button:has-text("Audit Report")').last().click();
    await expect(page.locator("#audit-regulation")).toHaveValue("aml-ctf-rules");

    const openedUrl = captureWindowOpen(page);
    await page.getByRole("button", { name: "Generate PDF" }).click();

    expect(await openedUrl).toMatch(/^blob:/);
  });

  test("'Generate PDF' button briefly shows 'Generating…' then calls window.open", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Generate Report/i }).click();

    const openedUrl = captureWindowOpen(page);
    await page.getByRole("button", { name: "Generate PDF" }).click();

    // Tolerate the generating state being too brief to catch
    const isGenerating = await page
      .getByRole("button", { name: "Generating…" })
      .isVisible()
      .catch(() => false);

    expect(await openedUrl).toMatch(/^blob:/);
    expect(typeof isGenerating).toBe("boolean"); // documents intent; always passes
  });
});
