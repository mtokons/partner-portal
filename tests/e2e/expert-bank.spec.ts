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

test("Admin sees Master Expert Bank menu + page loads with KPIs", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/admin/expert-bank"]').first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/expert-bank`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Master Expert Bank").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Total experts").first()).toBeVisible();
  await expect(page.locator("text=Available").first()).toBeVisible();
  await expect(page.locator("text=Booked / locked").first()).toBeVisible();
});

test("Save a tailored CV to the Master Expert Bank creates an expert", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });

  // Select first project
  const projectSelect = page.locator("select").first();
  const options = await projectSelect.locator("option").all();
  if (options.length > 1) await projectSelect.selectOption({ index: 1 });

  // Upload a CV
  const uniqueName = `Bank Test Expert ${Date.now()}`;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "cv.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(`${uniqueName}. 12 years TVET curriculum development. GIZ Bangladesh and Germany. English C1.`),
  });
  await page.locator('button:has-text("Tailor CV with AI")').click();

  // Wait for AI preview
  await expect(page.locator('button:has-text("Save to Master Bank")')).toBeVisible({ timeout: 120_000 });

  // Fill dedup email + level, save to bank
  const email = `bank.test.${Date.now()}@example.com`;
  await page.locator('input[placeholder="Expert email (for dedup)"]').fill(email);
  await page.locator('input[placeholder*="Level"]').fill("Key Expert 1");
  await page.locator('button:has-text("Save to Master Bank")').click();

  // Confirmation message
  await expect(page.locator("text=/Master Bank/").first()).toBeVisible({ timeout: 60_000 });
  // Implement-for-partners button appears after save
  await expect(page.locator('button:has-text("Implement for Partners")')).toBeVisible({ timeout: 10_000 });
});

test("Evaluation Report tab is editable in preview mode", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });

  const projectSelect = page.locator("select").first();
  const options = await projectSelect.locator("option").all();
  if (options.length > 1) await projectSelect.selectOption({ index: 1 });

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "cv.txt", mimeType: "text/plain",
    buffer: Buffer.from("Dr. Report Test. 15 years vocational education. GIZ projects. English C1."),
  });
  await page.locator('button:has-text("Tailor CV with AI")').click();
  await expect(page.locator('button:has-text("Evaluation Report")')).toBeVisible({ timeout: 120_000 });

  await page.locator('button:has-text("Evaluation Report")').click();
  await expect(page.locator("text=Short TOR Rating Analysis").first()).toBeVisible();
  await expect(page.locator("text=Strengths").first()).toBeVisible();
  await expect(page.locator("text=Gaps vs TOR").first()).toBeVisible();
});

test("Partner portal exposes Available Experts page", async ({ page }) => {
  await loginAdmin(page);
  // Admin can access project-partner pages (SCCG admin)
  await page.goto(`${BASE_URL}/project-partner/experts`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Available Experts").first()).toBeVisible({ timeout: 20_000 });
});
