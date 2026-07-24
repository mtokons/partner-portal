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

test("extract-tor endpoint returns a structured excerpt via proxy", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAdmin(page);
  const tor = "Position: Senior TVET Expert. Required qualifications: Master degree in education; at least 10 years experience in vocational training; experience in GIZ/EU projects. Key tasks: review curriculum, deliver training materials, prepare expert reports.";
  const r = await page.request.post(`${BASE_URL}/api/cv-tailor/extract-tor`, {
    multipart: { file: { name: "tor.txt", mimeType: "text/plain", buffer: Buffer.from(tor) } },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty("excerpt_text");
  expect(body).toHaveProperty("provider");
});

test("extract-matrix endpoint returns role matrices via proxy", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAdmin(page);
  const matrix = "Team Leader: Education degree (10 pts), 15 years experience (10 pts). Key Expert 1: TVET expertise (8 pts), Curriculum design (6 pts). Key Expert 2: M&E experience (5 pts).";
  const r = await page.request.post(`${BASE_URL}/api/cv-tailor/extract-matrix`, {
    multipart: { file: { name: "matrix.txt", mimeType: "text/plain", buffer: Buffer.from(matrix) } },
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(Array.isArray(body.matrices)).toBeTruthy();
});

test("Admin sees ToR Library menu entry and both tabs load", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/admin/tor-library"]').first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/tor-library`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=ToR Library").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=ToR Excerpts").first()).toBeVisible();
  await expect(page.locator("text=Evaluation Matrices").first()).toBeVisible();

  // Switch to matrix tab
  await page.locator("button", { hasText: "Evaluation Matrices" }).first().click();
  await expect(page.locator("text=Add evaluation matrix").first()).toBeVisible();
});

test("ToR Library supports pasting text directly + shows format guidance", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/tor-library`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Best results").first()).toBeVisible({ timeout: 20_000 });
  await page.locator("button", { hasText: "Paste Text" }).first().click();
  await expect(page.locator('textarea[placeholder*="Terms of Reference text"]').first()).toBeVisible({ timeout: 10_000 });
});

test("CV Tailor now shows ToR Excerpt and Evaluation Matrix library dropdowns", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=ToR Excerpt (from Library)").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Evaluation Matrix (from Library)").first()).toBeVisible();
});
