import { test, expect } from "@playwright/test";

// Smoke tests for public, unauthenticated routes.
// Requires the dev server to be running (npm run dev) before invoking.

test.describe("public routes", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/.*/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("verify endpoint shows not-found for an unknown code", async ({ page }) => {
    await page.goto("/verify/UNKNOWN-TEST-1234");
    await expect(page.getByText(/Certificate Not Found/i)).toBeVisible();
  });

  test("verify endpoint shows not-found for an invalid-format code", async ({ page }) => {
    // Format violation (too short) — server should treat as not-found without DB lookup.
    await page.goto("/verify/abc");
    await expect(page.getByText(/Certificate Not Found/i)).toBeVisible();
  });
});
