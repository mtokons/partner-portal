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

test("Admin sees Evaluation Wizard menu + step 1 loads", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/admin/evaluation-wizard"]').first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/evaluation-wizard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Evaluation Wizard").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Select or add expert").first()).toBeVisible();
  await expect(page.locator("text=Current location").first()).toBeVisible();
  await expect(page.locator("text=Proposed position").first()).toBeVisible();
});

test("Full wizard flow: identity → upload → analyse → adjust → save", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/evaluation-wizard`, { waitUntil: "domcontentloaded" });

  // Step 1 — fill identity + context
  await page.locator('input[placeholder="Full name"]').fill(`Wizard Expert ${Date.now()}`);
  await page.locator('input[placeholder="email@example.com"]').fill(`wizard.${Date.now()}@example.com`);
  await page.locator('input[placeholder="e.g. Berlin, Germany"]').fill("Dhaka, Bangladesh");
  await page.locator('input[placeholder="e.g. Senior TVET Expert"]').fill("Senior TVET Expert");
  await page.locator("text=Next →").click();

  // Step 2 — upload CV, run analysis
  await expect(page.locator("text=Upload CV")).toBeVisible({ timeout: 10_000 });
  await page.locator('input[type="file"]').setInputFiles({
    name: "cv.txt", mimeType: "text/plain",
    buffer: Buffer.from("Dr. Wizard Expert. 12 years TVET curriculum development in Bangladesh and Germany (GIZ). Master of Vocational Education. English C1."),
  });
  await page.locator('button:has-text("Run analysis")').click();

  // Step 3 — adjust report visible
  await expect(page.locator("text=Evaluation matrix (adjust scores")).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("text=Strengths").first()).toBeVisible();
  await expect(page.locator("text=Gaps vs TOR").first()).toBeVisible();

  // Confirm & save
  await page.locator('button:has-text("Confirm & save evaluation")').click();

  // Step 4 — done
  await expect(page.locator("text=Evaluation saved")).toBeVisible({ timeout: 60_000 });
});
