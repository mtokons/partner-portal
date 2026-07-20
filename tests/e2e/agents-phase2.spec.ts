import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ORG_ADMIN = "admin.educraft@mysccg.de";
const VIEWER = "viewer.educraft@mysccg.de";
const PASSWORD = "Portal1!";

async function login(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/project-partner/, { timeout: 30_000 });
}

const SAMPLE_TOR = `Terms of Reference — GIZ Skills Development Programme.
The assignment requires the following experts:
Key Expert 1 (Team Leader): must have a Master's university degree in vocational education.
Must have 10 years of professional experience in TVET curriculum development.
Preferred: experience in development cooperation projects with GIZ or EU.
Key Expert 2: must hold a university degree in engineering.
Must have 5 years of experience delivering training of trainers (ToT).
Deliverables: Inception Report; Final Report; Case Studies.`;

test("Persona 1 — ToR Analyzer extracts roles and can build a matrix", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/tor`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=ToR Analyzer").first()).toBeVisible({ timeout: 20_000 });

  await page.locator('#rawText').fill(SAMPLE_TOR);
  await page.locator('button:has-text("Analyze with")').first().click();

  // A role appears (real AI or mock both extract "Key Expert")
  await expect(page.getByText(/Key Expert/i).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('button:has-text("Approve & build matrix")').first()).toBeVisible({ timeout: 10_000 });
});

test("Persona 4 — Report drafting produces an editable draft", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/reports`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Report Drafts").first()).toBeVisible({ timeout: 20_000 });

  await page.locator('#section').fill(`QA Case Study ${Date.now()}`);
  await page.locator('#sources').fill("Cohort 1 trained 24 participants over 5 days. 20 completed the post-test with an average score of 78%. Participants included 14 women.");
  await page.locator('button:has-text("Draft with")').first().click();

  // A draft card with an editable textarea appears
  await expect(page.getByText(/QA Case Study/i).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('button:has-text("Mark final")').first()).toBeVisible({ timeout: 10_000 });
});

test("AI Activity dashboard shows logged agent runs", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/activity`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=AI Activity").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Recent runs").first()).toBeVisible();
});

test("New AI menu items are admin-only", async ({ page }) => {
  await login(page, ORG_ADMIN);
  for (const href of ["/project-partner/manage/tor", "/project-partner/manage/reports", "/project-partner/manage/activity"]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({ timeout: 20_000 });
  }
});

test("Viewer cannot see the new AI menu items", async ({ page }) => {
  await login(page, VIEWER);
  await expect(page.locator('a[href="/project-partner/manage/tor"]')).toHaveCount(0);
  await expect(page.locator('a[href="/project-partner/manage/reports"]')).toHaveCount(0);
  await expect(page.locator('a[href="/project-partner/manage/activity"]')).toHaveCount(0);
});
