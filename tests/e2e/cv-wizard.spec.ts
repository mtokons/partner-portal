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

test("Admin sees CV Creation Wizard menu + step 0 loads with expert list", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/admin/cv-wizard"]').first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/admin/cv-wizard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=CV Creation Wizard").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Select expert from the Master Bank").first()).toBeVisible();
  await expect(page.locator("text=Select expert").first()).toBeVisible();
});

test("tailor-from-json endpoint returns a valid TailorResult via proxy", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAdmin(page);
  const payload = {
    expert_name: "Dr. Test CV Wizard",
    nationality: "German",
    current_location: "Berlin",
    level: "Senior Expert",
    proposed_position: "TVET Expert",
    experience_summary: "Professional Summary:\n10 years TVET curriculum development. GIZ projects in Bangladesh and Germany.",
    education_summary: "Master of Science in Vocational Education, TU Dresden 2007.",
    languages_summary: "English C1, German B2, Bangla mother tongue.",
    strengths: "• TVET curriculum: 10 years curriculum development\n• GIZ experience: multiple projects",
    previous_matrix_matches: [{ requirement: "TVET experience", evidence: "10 years curriculum development", score: 4, max_score: 5 }],
    tor_text: "Senior TVET Expert with 10+ years curriculum development for vocational education.",
    criteria_json: JSON.stringify([{ label: "TVET experience", maxPoints: 5 }]),
    project_name: "TVET Bangladesh",
    bangladesh_project: false,
    sector_groups: [],
    deep_analysis: false,
  };
  const r = await page.request.post(`${BASE_URL}/api/cv-tailor/tailor-from-json`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(payload),
  });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty("expert_name");
  expect(body).toHaveProperty("tor_match_pct");
  expect(Array.isArray(body.sections)).toBeTruthy();
  expect(body.sections.length).toBeGreaterThan(0);
});
