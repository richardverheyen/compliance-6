/**
 * User Journey 2: Complete an AML/CTF self-assessment from the homepage
 *
 * Scenario: a Legal firm serving Individuals, Companies and Customer Agents
 * answers every question with the compliant ("Yes") answer, fills all
 * additional-information fields, completes the assessment, then generates
 * an Audit Report PDF from the dashboard.
 *
 * Authentication is handled once in globalSetup (e2e/global-setup.ts) and
 * loaded here via storageState — the sign-up flow itself is covered by Journey 1.
 *
 * Video is always recorded so the full journey is captured.
 */

import { test, expect } from "@playwright/test";
import {
  clearAppStorage,
  answerYesNo,
  answerAllYes,
  selectAllSubScoping,
  fillAllDetailTextareas,
} from "./helpers";
import { SHARED_AUTH_FILE } from "./global-setup";

// Always record video for this journey.
test.use({ video: "on" });

// Add 0.25 s delay between every Playwright action so the video is easy to follow.
test.use({ launchOptions: { slowMo: 250 } });

// Load the pre-authenticated Clerk session created in globalSetup.
test.use({ storageState: SHARED_AUTH_FILE });

// Allow 10 minutes — slowMo: 250 adds ~250 ms per action across hundreds of steps.
test.setTimeout(600_000);

// ── Constants ─────────────────────────────────────────────────────────────────

/** Boilerplate detail text for every "Enter details…" textarea. */
const DETAIL_TEXT =
  "Our legal firm maintains comprehensive documented procedures for this compliance " +
  "requirement, reviewed quarterly by the compliance committee in accordance with our " +
  "AML/CTF Program and applicable AUSTRAC obligations.";

/**
 * Process slugs that will be visible in the assessment for a scope of
 * Individuals + Companies + Customer Agents.
 *
 * Always active (gatedBy: null):
 *   risk-assessment, verification-documents, verification-electronic, alternative-id
 * Gated by Individuals (4_1_4_1):
 *   cdd-individuals
 * Gated by Companies (4_1_4_2):
 *   cdd-companies
 * Gated by Customer Agents (4_1_8):
 *   agent-management
 * Derived from Companies (4_1_5_1 — any non-individual customer):
 *   beneficial-ownership
 * Derived from Individuals + Companies (4_1_5_2 — any customer type):
 *   pep-screening
 */
const PROCESSES = [
  "risk-assessment",
  "cdd-individuals",
  "cdd-companies",
  "verification-documents",
  "verification-electronic",
  "agent-management",
  "beneficial-ownership",
  "pep-screening",
  "alternative-id",
];

/** Intercept window.open and resolve with the first URL it receives. */
function captureWindowOpen(page: Parameters<typeof clearAppStorage>[0]) {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const original = window.open.bind(window);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).open = function (url: string, ...rest: unknown[]) {
          resolve(String(url ?? ""));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).open = original;
          return original(url, ...(rest as [string?, string?]));
        };
      }),
  );
}

// ── Journey ───────────────────────────────────────────────────────────────────

test("Journey 2 — AML/CTF self-assessment for a Legal firm", async ({ page }) => {
  await clearAppStorage(page);

  // ── Step 1: Start from the homepage (journey starting point) ─────────────
  await page.goto("/");
  await page.waitForLoadState("load");
  // Wait for Clerk to hydrate and render the signed-in navbar state.
  // The "Dashboard" link only appears inside <SignedIn>, which requires
  // Clerk's JS to initialize and confirm the session.
  await page.locator('a[href="/dashboard"]').waitFor({ state: "visible", timeout: 15_000 });

  // ── Step 2: Navigate to the dashboard via the homepage navbar ─────────────
  await page.locator('a[href="/dashboard"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  // ── Step 3: Navigate to the regulations list ──────────────────────────────
  // The dashboard layout renders its own nav with a "Regulations" link.
  await page.getByRole("link", { name: "Regulations" }).first().click();
  await page.waitForURL(/\/dashboard\/regulations$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  // ── Step 4: Open the AML/CTF Rules regulation ─────────────────────────────
  await page.getByRole("link", { name: /AML\/CTF Rules/ }).first().click();
  await page.waitForURL(/aml-ctf-rules/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  // ── Step 5: Activate the regulation with the legal firm's scope ───────────
  // Customer types: Individuals, Companies, Customer Agents
  await page.getByRole("button", { name: "Begin Compliance Self-Assessment" }).click();
  // Wait for the scoping form to expand (Activate button becomes visible).
  await expect(page.getByRole("button", { name: "Activate Compliance Tracking" })).toBeVisible();

  for (const customerType of ["Individuals", "Companies", "Customer Agents"]) {
    await page.getByRole("button", { name: customerType, exact: true }).click();
  }

  await page.getByRole("button", { name: "Activate Compliance Tracking" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("In progress")).toBeVisible();

  // ── Step 6: Complete each process form ────────────────────────────────────
  for (const slug of PROCESSES) {
    await page.goto(`/dashboard/regulations/aml-ctf-rules/processes/${slug}`);
    await page.waitForLoadState("networkidle");

    // Confirm this process exists in the firm (unlocks the main question groups).
    await answerYesNo(page, "process-exists", "Yes");

    // Some forms (cdd-individuals, cdd-companies) show a sub-scoping panel
    // that requires at least one sub-type selected before main questions appear.
    await selectAllSubScoping(page);

    // Four rounds to handle chained conditional-visibility rules:
    // answering Yes to question A may reveal question B, which when answered
    // Yes may reveal question C, and so on.
    for (let i = 0; i < 4; i++) {
      await answerAllYes(page);
      await fillAllDetailTextareas(page, DETAIL_TEXT);
    }

    // Save answers and return to the regulation detail page.
    await page.getByRole("button", { name: "Save & Return" }).click();
    // Wait for navigation back to the regulation page (not a process sub-page).
    await page.waitForURL(/aml-ctf-rules(?!.*\/processes\/)/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
  }

  // ── Step 7: Complete the assessment ──────────────────────────────────────
  // "Complete Assessment" appears only when every visible process form is 100%.
  await page.goto("/dashboard/regulations/aml-ctf-rules");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("button", { name: "Complete Assessment" }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Complete Assessment" }).click();
  await page.waitForLoadState("networkidle");

  // The "#1 In progress" tab should now show as completed.
  await expect(page.getByText(/Completed/)).toBeVisible({ timeout: 10_000 });

  // ── Step 8: Generate an Audit Report PDF from the dashboard ───────────────
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /Generate Report/i }).click();
  // Target the modal h2 specifically — the dashboard also has a "Generate Report"
  // card heading (h3) which would cause a strict-mode violation otherwise.
  await expect(page.getByRole("heading", { name: "Generate Report", level: 2 })).toBeVisible();

  // Set up the window.open spy only after the modal is open and before Generate PDF.
  // @react-pdf/renderer generates the blob asynchronously; we resolve when
  // window.open is eventually called with the resulting blob: URL.
  const openedUrl = captureWindowOpen(page);

  // Switch to Audit Report type.
  await page.locator('button:has-text("Audit Report")').last().click();
  // The dropdown should auto-select the only active regulation.
  await expect(page.locator("#audit-regulation")).toHaveValue("aml-ctf-rules");

  await page.getByRole("button", { name: "Generate PDF" }).click();

  // Assert the PDF was opened as a blob: URL.
  const blobUrl = await openedUrl;
  expect(blobUrl).toMatch(/^blob:/);

  // ── Step 9: Validate the PDF and display evidence in the video ───────────
  // Chromium's PDF viewer (PDFium) runs in a sandboxed process that
  // Playwright's CDP screencast cannot capture, so navigating to the blob URL
  // would produce a blank recording. Instead we fetch the blob in-page,
  // assert it is a well-formed PDF, and inject a visible confirmation banner
  // so the video records clear proof of the generated document.
  const pdfInfo = await page.evaluate(async (url) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // PDF files always start with the magic bytes %PDF-
    const header = String.fromCharCode(...bytes.slice(0, 5));
    const kb = Math.round(buf.byteLength / 1024);
    return { header, kb, valid: header === "%PDF-" };
  }, blobUrl);

  expect(pdfInfo.valid).toBe(true);

  // Inject a full-screen confirmation banner so it is visible in the recording.
  await page.evaluate(({ kb }) => {
    const overlay = document.createElement("div");
    overlay.id = "pdf-evidence-overlay";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999",
      "background:#1e3a5f", "color:#fff",
      "display:flex", "flex-direction:column",
      "align-items:center", "justify-content:center",
      "font-family:system-ui,sans-serif", "gap:16px",
    ].join(";");
    overlay.innerHTML = `
      <div style="font-size:72px">✅</div>
      <div style="font-size:32px;font-weight:700">Audit Report PDF Generated</div>
      <div style="font-size:20px;opacity:.85">Valid PDF · ${kb} KB · blob URL confirmed</div>
    `;
    document.body.appendChild(overlay);
  }, pdfInfo);

  // Hold the overlay on screen long enough for the video to clearly record it.
  await page.waitForTimeout(4_000);
});
