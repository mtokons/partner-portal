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

test("Python CV Tailor service health returns ok via proxy", async ({ page }) => {
  await loginAdmin(page);
  const r = await page.request.get(`${BASE_URL}/api/cv-tailor/health`);
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body.status).toBe("ok");
});

test("Admin sees CV Tailor menu entry and the 3-panel page loads", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/admin/cv-tailor"]').first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=CV Tailor").first()).toBeVisible({ timeout: 20_000 });

  // All 3 step pills visible
  await expect(page.locator("text=Setup & Upload").first()).toBeVisible();
  await expect(page.locator("text=AI Preview").first()).toBeVisible();
  await expect(page.locator("text=Format & Export").first()).toBeVisible();

  // Service status badge + template cards
  await expect(page.locator("text=Python service").first()).toBeVisible();
  await expect(page.locator("text=GIZ Corporate Format").first()).toBeVisible();
  await expect(page.locator("text=Standard EU CV").first()).toBeVisible();
});

test("Uploading a CV file calls the tailor endpoint and shows AI preview", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });

  // Select the first available project
  const projectSelect = page.locator("select").first();
  const options = await projectSelect.locator("option").all();
  if (options.length > 1) await projectSelect.selectOption({ index: 1 });

  // Upload a small text CV
  await page.locator('input[type="file"]').setInputFiles({
    name: "test-cv.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Dr. Jane Doe. Master of Science in TVET. 15 years curriculum development. English C1, Bangla mother tongue. Worked on GIZ and ADB projects."),
  });

  await page.locator('button:has-text("Tailor CV with AI")').click();

  // Real AI (or mock fallback) returns result — the "Tailored CV" tab and match badge appear
  await expect(page.locator("text=Tailored CV").first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("text=Requirement Matrix").first()).toBeVisible();
});
