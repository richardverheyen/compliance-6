import { test, expect } from "@playwright/test";
import { clearAppStorage, uniqueEmail } from "./helpers";

test.describe("User creation", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test("signs up with valid credentials and lands on dashboard", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/signup");

    await page.fill("#name", "Jane Smith");
    await page.fill("#email", email);
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("/dashboard", { timeout: 15_000 });

    // Dashboard navbar shows the user's name (first match is the nav element)
    await expect(page.getByText("Jane Smith").first()).toBeVisible();
  });

  test("shows an error when signing up with a duplicate email", async ({ page }) => {
    const email = uniqueEmail();

    // Patch window.fetch in an init script so the second /api/auth/signup call
    // returns a 409 directly, without relying on MSW service-worker state persisting
    // across page navigations. A sessionStorage counter tracks which call we're on.
    await page.addInitScript(() => {
      const _original = window.fetch.bind(window);
      window.fetch = async function patchedFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
      ) {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes("/api/auth/signup")) {
          const n =
            parseInt(sessionStorage.getItem("__e2e_signup_n") ?? "0") + 1;
          sessionStorage.setItem("__e2e_signup_n", String(n));
          if (n >= 2) {
            return new Response(
              JSON.stringify({ error: "Email already in use" }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }
        return _original(input, init);
      };
    });

    // First signup (passes through to MSW)
    await page.goto("/signup");
    await page.fill("#name", "Original User");
    await page.fill("#email", email);
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15_000 });

    // Clear auth state so we appear logged out, then attempt the same email again
    await page.evaluate(() => localStorage.removeItem("auth-storage"));
    await page.goto("/signup");
    await page.fill("#name", "Duplicate User");
    await page.fill("#email", email);
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    // The patched fetch returns 409 → error banner should appear
    await expect(page.locator(".rounded-lg.bg-red-50")).toBeVisible();
    await expect(page.url()).toContain("/signup");
  });

  test("rejects a password shorter than 6 characters via HTML5 validation", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#name", "Short Pass");
    await page.fill("#email", uniqueEmail());
    await page.fill("#password", "abc");

    // Click submit — HTML5 minLength prevents form submission
    await page.click('button[type="submit"]');

    // Remains on the signup page
    await expect(page.url()).toContain("/signup");
    await expect(page.locator("#password:invalid")).toBeTruthy();
  });

  test("'Log in' link navigates to login page from signup", async ({ page }) => {
    await page.goto("/signup");
    await page.click('a:has-text("Log in")');
    await expect(page).toHaveURL("/login");
  });
});
