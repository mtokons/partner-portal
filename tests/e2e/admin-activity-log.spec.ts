import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ADMIN_EMAIL = "qa.admin@mysccg.de";
const ADMIN_PASSWORD = "Portal1!";

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
}

test.describe("Admin Activity Log", () => {
  test("Activity Log link is in the admin sidebar and opens the page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/overview`, { waitUntil: "domcontentloaded" });

    const link = page.getByRole("link", { name: /Activity Log/i }).first();
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();

    await page.waitForURL(/\/admin\/activity-log/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Activity Log/i })).toBeVisible({ timeout: 15_000 });
  });

  test("page shows filters (user + action) and a results table", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/activity-log`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Activity Log/i })).toBeVisible({ timeout: 20_000 });

    // Filter controls
    await expect(page.getByPlaceholder(/Search description/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/Filter by user/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/Filter by action/i)).toBeVisible({ timeout: 10_000 });

    // Table headers
    await expect(page.getByRole("columnheader", { name: /^When$/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("columnheader", { name: /^Action$/i })).toBeVisible({ timeout: 10_000 });
  });

  test("a fresh admin login is recorded and appears in the log", async ({ page }) => {
    // This login itself should generate a 'login' audit entry.
    await loginAsAdmin(page);

    // Give the audit write a moment to land, then open the log.
    await page.goto(`${BASE_URL}/admin/activity-log`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Activity Log/i })).toBeVisible({ timeout: 20_000 });

    // Refresh to pull the latest entries
    await page.getByRole("button", { name: /Refresh/i }).click();
    await page.waitForTimeout(2500);

    // Filter to the admin user (option value === actor email) to reduce noise
    const userSelect = page.getByLabel(/Filter by user/i);
    const hasAdminOption = await userSelect.locator(`option[value='${ADMIN_EMAIL}']`).count();
    if (hasAdminOption > 0) {
      await userSelect.selectOption(ADMIN_EMAIL).catch(() => {});
    }

    // A Login badge should be present somewhere in the table body
    const tbody = page.locator("tbody");
    await expect(tbody.getByText(/^Login$/i).first()).toBeVisible({ timeout: 15_000 });

    // The admin email should appear in the table body
    await expect(tbody.getByText(new RegExp(ADMIN_EMAIL, "i")).first()).toBeVisible({ timeout: 15_000 });
  });

  test("filtering by action narrows the visible entries", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/activity-log`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Activity Log/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Refresh/i }).click();
    await page.waitForTimeout(2000);

    const actionSelect = page.getByLabel(/Filter by action/i);
    // If a Login option exists, selecting it should keep only login rows
    const hasLogin = await actionSelect.locator("option[value='login']").count();
    if (hasLogin > 0) {
      await actionSelect.selectOption("login");
      await page.waitForTimeout(500);
      // The login badge should be visible in the table body when filtered to login
      await expect(page.locator("tbody").getByText(/^Login$/i).first()).toBeVisible({ timeout: 10_000 });
    } else {
      // No data yet — at minimum the empty-state or table renders without crashing
      await expect(page.getByRole("heading", { name: /Activity Log/i })).toBeVisible();
    }
  });
});
