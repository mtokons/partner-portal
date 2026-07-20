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

test.describe("Admin Promo Codes", () => {
  test("Create Code button actually creates a promo code that persists", async ({ page }) => {
    const uniqueCode = `QA-E2E-${Date.now().toString().slice(-7)}`;

    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/promo-codes`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Promo/i })).toBeVisible({ timeout: 20_000 });

    // Open the create form
    await page.getByRole("button", { name: /Create Code/i }).click();
    await expect(page.getByRole("heading", { name: /New Promo Code/i })).toBeVisible({ timeout: 10_000 });

    // Fill an explicit, unique code so we can find it deterministically
    await page.getByPlaceholder("SCCG-XXXX").fill(uniqueCode);

    // Submit
    await page.getByRole("button", { name: /^Create Promo Code$/i }).click();

    // Form should close and the new code should appear in the table
    await expect(page.getByText(uniqueCode, { exact: true })).toBeVisible({ timeout: 20_000 });

    // Reload the page — the code must still be there (proves it persisted to SharePoint)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(uniqueCode, { exact: true })).toBeVisible({ timeout: 20_000 });

    // Cleanup: delete the test promo code (delete uses a confirm() dialog)
    page.on("dialog", (d) => d.accept());
    const row = page.locator("tr", { hasText: uniqueCode });
    await row.getByTitle("Delete").click();
    await expect(page.getByText(uniqueCode, { exact: true })).toHaveCount(0, { timeout: 20_000 });
  });
});
