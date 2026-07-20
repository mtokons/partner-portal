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

test("/templates endpoint includes custom1", async ({ page }) => {
  await loginAdmin(page);
  const r = await page.request.get(`${BASE_URL}/api/cv-tailor/templates`);
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty("custom1");
  expect(body.custom1.label).toBe("Custom CV Format 1");
});

test("CV Tailor shows Custom CV Format 1 template option", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Custom CV Format 1").first()).toBeVisible({ timeout: 20_000 });
});

test("Selecting custom1 template shows Personal & Structured Data form", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-tailor`, { waitUntil: "domcontentloaded" });
  // Click the Custom CV Format 1 template card
  await page.locator("button", { hasText: "Custom CV Format 1" }).first().click();
  // Person data form should appear
  await expect(page.locator("text=Personal & Structured Data").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("text=Family Name").first()).toBeVisible();
  await expect(page.locator("text=Education").first()).toBeVisible();
  await expect(page.locator("text=Language Skills").first()).toBeVisible();
  await expect(page.locator("text=Professional Experience").first()).toBeVisible();
});

test("/generate endpoint builds a valid DOCX for custom1 with person_data", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAdmin(page);

  const payload = {
    template_id: "custom1",
    result: {
      expert_name: "Dr. Test Expert",
      tor_match_pct: 82,
      sections: [
        { section: "Key Qualifications", tailored: "Over 10 years of TVET curriculum development experience.", keywords: ["TVET"] },
      ],
      matrix_matches: [
        { requirement: "TVET experience", evidence: "10 years curriculum development", score: 4, max_score: 5 },
      ],
      provider: "mock",
    },
    person_data: {
      proposedRole: "Senior TVET Expert",
      familyName: "Expert",
      firstName: "Dr. Test",
      dateOfBirth: "01/01/1975",
      nationality: "German",
      placeOfResidence: "Berlin, Germany",
      email: "expert@example.com",
      tel: "+49 30 12345678",
      membership: "GIZ Alumni Network",
      otherSkills: "Microsoft Office, Adobe",
      presentPosition: "TVET Consultant",
      education: [{ institution: "TU Dresden", dateFrom: "10/2004", dateTo: "01/2007", degree: "MSc Vocational Education" }],
      training: [{ course: "PRINCE2", provider: "Simplilearn", location: "Online", year: "2026", competency: "Project management", certificate: "Awarded" }],
      languages: [{ language: "English", reading: "C1", speaking: "C1", writing: "C1" }],
      regions: [{ nr: "1.", region: "South Asia", country: "Bangladesh", dates: "2022 – 2025" }],
      experience: [{ dateFrom: "01/2022", dateTo: "12/2024", wd: "36 months", location: "Bangladesh", company: "GIZ", position: "TVET Advisor", projectTitle: "TVET4RE", donor: "BMZ", description: "Curriculum development and trainer training." }],
      publications: ["Test publication 2024"],
    },
  };

  const r = await page.request.post(`${BASE_URL}/api/cv-tailor/generate`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(payload),
  });
  expect(r.ok()).toBeTruthy();
  const ct = r.headers()["content-type"] || "";
  expect(ct).toContain("officedocument");
  const body = await r.body();
  expect(body.length).toBeGreaterThan(5000); // non-trivial DOCX
});
