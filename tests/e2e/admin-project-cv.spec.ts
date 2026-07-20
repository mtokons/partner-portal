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

test("Admin project CVs table has Replace button + Last Updated column", async ({ page }) => {
  test.setTimeout(120_000);
  page.on("dialog", (d) => d.accept());
  const fname = `qa-e2e-${Date.now()}.txt`;

  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/projects/1`, { waitUntil: "domcontentloaded" });

  // Scope to the CVs folder section
  const cvSection = page.locator('section').filter({ has: page.locator('h3:has-text("CVs")') }).first();
  await expect(cvSection).toBeVisible({ timeout: 20_000 });

  // Upload a temporary CV file
  await cvSection.locator('input[type="file"]').first().setInputFiles({
    name: fname, mimeType: "text/plain", buffer: Buffer.from("QA E2E temporary CV content."),
  });

  // The uploaded row appears with a Last Updated header + a Replace control
  await expect(cvSection.getByText(fname).first()).toBeVisible({ timeout: 30_000 });
  await expect(cvSection.getByText("Last updated").first()).toBeVisible();
  const row = cvSection.locator("li").filter({ hasText: fname }).first();
  await expect(row.locator('label[title*="Replace"]')).toBeVisible();
  await expect(row.locator('a[title="Download"]')).toBeVisible();

  // Cleanup: delete the temp file
  await row.locator('button[title="Delete"]').click();
  await expect(cvSection.getByText(fname)).toHaveCount(0, { timeout: 20_000 });
});
