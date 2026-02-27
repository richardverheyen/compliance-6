import { Page } from "@playwright/test";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const BUSINESS_PROFILE = {
  businessName: "Acme Financial Services",
  location: "New South Wales",
  foundingYear: "2020",
  employeeCount: "25",
};

/** Generate a unique email address per test run to avoid duplicates. */
export function uniqueEmail(): string {
  return `e2e-${Date.now()}@test.example`;
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
      localStorage.removeItem("auth-storage");
      localStorage.removeItem("compliance-storage-v2");
    }
  });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Sign up via the /signup page and wait for the /dashboard redirect. */
export async function signUp(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  await page.goto("/signup");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15_000 });
}

// ─── Regulation helpers ───────────────────────────────────────────────────────

/**
 * Activate the AML/CTF regulation.
 * Fills the business profile form, optionally toggles customer types in the
 * scoping section, then submits. Assumes the user is already logged in.
 */
export async function activateAMLRegulation(
  page: Page,
  opts: { customerTypes?: string[]; services?: string[] } = {},
) {
  const { customerTypes = [], services = ["Remittance"] } = opts;

  await page.goto("/dashboard/regulations/aml-ctf-rules");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Begin Compliance Self-Assessment" }).click();

  // Business Profile
  await page.locator('label:has-text("Business Name") + input').fill(BUSINESS_PROFILE.businessName);
  await page.locator('label:has-text("Location") + select').selectOption(BUSINESS_PROFILE.location);
  await page.locator('label:has-text("Founding Year") + input').fill(BUSINESS_PROFILE.foundingYear);
  await page.locator('label:has-text("Employee Count") + input').fill(BUSINESS_PROFILE.employeeCount);

  // Applicable Services checkboxes
  for (const svc of services) {
    await page.getByLabel(svc).check();
  }

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

  // State C button or State D button
  await page.getByRole("button", {
    name: /Start your first Self Assessment|Start New Self Assessment/,
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
