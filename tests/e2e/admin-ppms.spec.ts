import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ADMIN_EMAIL = "qa.admin@mysccg.de";
const PASSWORD = "Portal1!";

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
}

test("SCCG admin sees the Project Partner AI menu group in the admin portal", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  for (const href of [
    "/admin/ppms/tor",
    "/admin/ppms/intake",
    "/admin/ppms/review",
    "/admin/ppms/reports",
    "/admin/ppms/activity",
  ]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({ timeout: 20_000 });
  }
});

test("SCCG admin can open the AI tools from the admin portal", async ({ page }) => {
  await loginAdmin(page);

  await page.goto(`${BASE_URL}/admin/ppms/tor`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=ToR Analyzer").first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/ppms/review`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Scoring Review").first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/ppms/activity`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=AI Activity").first()).toBeVisible({ timeout: 20_000 });
});
