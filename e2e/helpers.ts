import { Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Generate a unique email for a test run.
 * The +clerk_test suffix enables Clerk's dev-mode magic OTP bypass (code: 424242).
 */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}+clerk_test@example.com`;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/**
 * Registers an init script that wipes Zustand-persisted state once — before
 * the very first page load of the test. Subsequent navigations (e.g. the
 * redirect to /dashboard after sign-up) are left untouched so the session
 * stays alive.
 */
export async function clearAppStorage(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("_e2e_cleared")) {
      sessionStorage.setItem("_e2e_cleared", "1");
      localStorage.removeItem("compliance-storage-v2");
    }
  });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Sign up via Clerk's hosted sign-up page, complete onboarding (org creation),
 * and wait for the /dashboard redirect.
 *
 * Flow: /sign-up → /onboarding (CreateOrganization) → /dashboard
 *
 * NOTE: This requires a real Clerk dev account with email verification disabled.
 * For CI, use @clerk/testing/playwright with setupClerkTestingToken() instead.
 */
export async function signUp(
  page: Page,
  name: string,
  email: string,
  password: string,
  orgName = "E2E Test Org",
) {
  // setupClerkTestingToken installs a bypass header that skips email OTP in dev mode.
  await setupClerkTestingToken({ page });

  await page.goto("/sign-up");
  await page.waitForURL(/sign-up/, { timeout: 15_000 });
  const [firstName, ...rest] = name.split(" ");
  await page.fill('input[name="firstName"]', firstName);
  if (rest.length > 0) await page.fill('input[name="lastName"]', rest.join(" "));
  await page.fill('input[name="emailAddress"]', email);
  await page.fill('input[name="password"]', password);
  // Clerk renders an aria-hidden button[type="submit"] alongside the visible "Continue" button.
  // force:true bypasses Next.js dev overlay portal which intercepts pointer events in dev mode.
  await page.getByRole("button", { name: "Continue" }).click({ force: true });

  // After "Continue", the possible next states are:
  //   1. OTP input appears (email verification required)
  //   2. Clerk sign-up task: /sign-up/tasks/choose-organization (org creation built into sign-up)
  //   3. Direct redirect to /onboarding or /dashboard
  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  await Promise.race([
    page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 30_000 }),
    otpInput.waitFor({ state: "visible", timeout: 30_000 }),
  ]);

  if (!page.url().match(/sign-up\/tasks|onboarding|dashboard/)) {
    // OTP appeared — use Clerk dev magic code (works when email has +clerk_test suffix)
    await otpInput.fill("424242");
    await page.waitForURL(/sign-up\/tasks|onboarding|dashboard/, { timeout: 20_000 });
  }

  if (page.url().includes("sign-up/tasks")) {
    // Clerk's built-in org setup task: fill org name and continue
    await page.waitForLoadState("load");
    const nameInput = page.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill(orgName);
    await page.getByRole("button", { name: "Continue" }).click({ force: true });
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    return;
  }

  if (page.url().includes("onboarding")) {
    // Custom /onboarding fallback: user reached our page, create org via <CreateOrganization>
    await page.waitForLoadState("load");
    await page.getByLabel(/organization name/i).fill(orgName);
    await page.getByRole("button", { name: /create organization/i }).click({ force: true });
    await page.waitForURL("/dashboard", { timeout: 30_000 });
  }
  // If already at /dashboard, we're done.
}

// ─── Regulation helpers ───────────────────────────────────────────────────────

/**
 * Activate the AML/CTF regulation.
 * Optionally toggles customer types in the scoping section, then submits.
 * Assumes the user is already logged in.
 */
export async function activateAMLRegulation(
  page: Page,
  opts: { customerTypes?: string[] } = {},
) {
  const { customerTypes = [] } = opts;

  await page.goto("/dashboard/regulations/aml-ctf-rules");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Begin Compliance Self-Assessment" }).click();

  // Customer type toggles in the scoping section
  for (const type of customerTypes) {
    await page.getByRole("button", { name: type, exact: true }).click();
  }

  await page.getByRole("button", { name: "Activate Compliance Tracking" }).click();
  await page.waitForLoadState("networkidle");
}

/**
 * Start a new self-assessment from the regulation detail page (State C or D).
 * Optionally toggles customer types in the assessment scoping form.
 */
export async function startAssessment(
  page: Page,
  opts: { customerTypes?: string[] } = {},
) {
  const { customerTypes = [] } = opts;

  // "Start your first Self Assessment" (State C) or "Start New Assessment" (tabbed State D)
  await page.getByRole("button", {
    name: /Start your first Self Assessment|Start New Assessment/,
  }).click();

  // Assessment-level scoping questions
  for (const type of customerTypes) {
    await page.getByRole("button", { name: type, exact: true }).click();
  }

  await page.getByRole("button", { name: "Start Assessment" }).click();
  await page.waitForLoadState("networkidle");
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

/**
 * Click the Yes or No label for a named radio control.
 * Targets the visible label wrapper, not the sr-only input.
 */
export async function answerYesNo(
  page: Page,
  controlId: string,
  answer: "Yes" | "No",
) {
  await page
    .locator(`label:has(input[name="${controlId}"][value="${answer}"])`)
    .click();
}

/**
 * Click all visible Yes radio buttons in the current process form.
 * Useful for quickly marking a form as fully compliant.
 */
export async function answerAllYes(page: Page) {
  // Collect unique control names so we only answer each once
  const inputs = page.locator('input[type="radio"][value="Yes"]:not(:disabled)');
  const count = await inputs.count();
  const answered = new Set<string>();

  for (let i = 0; i < count; i++) {
    const name = await inputs.nth(i).getAttribute("name");
    if (name && !answered.has(name)) {
      answered.add(name);
      await inputs.nth(i).evaluate((el: HTMLInputElement) => el.closest("label")?.click());
    }
  }
}
