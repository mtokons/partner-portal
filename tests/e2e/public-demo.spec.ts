import { test, expect } from "@playwright/test";

test.describe("Public ERP demo experience", () => {
  test("public demo page is accessible and shows credentials", async ({ page }) => {
    await page.goto("/erp-experience");
    await expect(page.getByRole("heading", { name: /Experience Our ERP Before You Hire Us/i })).toBeVisible();
    await expect(page.getByText(/public\.demo@mysccg\.de/i)).toBeVisible();
    await expect(page.getByText(/PortalDemo2026!/i)).toBeVisible();
  });

  test("demo login page pre-fills credentials", async ({ page }) => {
    await page.goto("/demo/login");
    await expect(page.locator('input[type="email"]')).toHaveValue("public.demo@mysccg.de");
    await expect(page.locator('input[type="password"], input[type="text"]').first()).toHaveValue("PortalDemo2026!");
  });
});
