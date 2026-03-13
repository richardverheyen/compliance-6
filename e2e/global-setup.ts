import { chromium } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import * as fs from "fs";
import * as path from "path";

/** Load .env.local so CLERK_SECRET_KEY is available in the global-setup Node process. */
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

export const SHARED_AUTH_FILE = "e2e/.auth/user.json";

export default async function globalSetup() {
  loadEnvLocal();
  await clerkSetup();

  // ── Create a shared authenticated session for tests that skip the auth flow ──
  // Signs up once, completes org setup, and saves browser storage state
  // (Clerk session cookies) to SHARED_AUTH_FILE for reuse across tests.
  fs.mkdirSync("e2e/.auth", { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  await setupClerkTestingToken({ page });

  const email = `e2e-shared-${Date.now()}+clerk_test@example.com`;

  await page.goto("/sign-up");
  await page.waitForLoadState("load");
  await page.fill('input[name="firstName"]', "E2E");
  await page.fill('input[name="lastName"]', "Shared");
  await page.fill('input[name="emailAddress"]', email);
  await page.fill('input[name="password"]', "Compl1ance!Test");
  await page.getByRole("button", { name: "Continue" }).click({ force: true });

  // Handle OTP if email verification is required
  const otpInput = page.locator('input[autocomplete="one-time-code"]');
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith("/sign-up"), { timeout: 30_000 }),
    otpInput.waitFor({ state: "visible", timeout: 30_000 }),
  ]);
  if (page.url().includes("/sign-up")) {
    await otpInput.fill("424242");
    // /sign-up/tasks/... is Clerk's org-creation step — treat it as "done with OTP".
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/sign-up") || url.pathname.startsWith("/sign-up/tasks"),
      { timeout: 30_000 },
    );
  }

  // Handle org creation (Clerk built-in task or custom /onboarding)
  if (page.url().includes("sign-up/tasks")) {
    await page.waitForLoadState("load");
    const nameInput = page.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill("E2E Test Org");
    await page.getByRole("button", { name: "Continue" }).click({ force: true });
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  } else if (page.url().includes("onboarding")) {
    await page.waitForLoadState("load");
    await page.getByLabel(/organization name/i).fill("E2E Test Org");
    await page.getByRole("button", { name: /create organization/i }).click({ force: true });
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  } else if (!page.url().includes("dashboard")) {
    await page.goto("/dashboard");
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  }

  await context.storageState({ path: SHARED_AUTH_FILE });
  await browser.close();
}
