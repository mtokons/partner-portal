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

const SAMPLE_CV = `Dr. Jane Doe. Master of Science in Vocational Education, University of Dhaka.
15 years of professional experience in the TVET sector developing competency standards and curricula.
Delivered training of trainers (ToT) programmes across Bangladesh and South Asia.
Languages: English (C1), Bangla (mother tongue). Worked on GIZ and ADB development cooperation projects.`;

test("Org admin: AI CV intake -> per-criterion judge -> review queue -> publish", async ({ page }) => {
  test.setTimeout(180_000); // real Gemini runs criteria sequentially
  const name = `QA Candidate ${Date.now()}`;
  await login(page, ORG_ADMIN);

  // 1. Intake page loads (project auto-selected)
  await page.goto(`${BASE_URL}/project-partner/manage/intake`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=AI CV Intake").first()).toBeVisible({ timeout: 20_000 });

  // 2. Extract a CV from pasted text
  await page.locator('#expertName').fill(name);
  await page.locator('#position').fill("Key Expert");
  await page.locator('#rawText').fill(SAMPLE_CV);
  await page.locator('button:has-text("Extract with")').first().click();

  // 3. Candidate card appears (upload runs two extraction calls on real AI)
  const card = page.locator('div').filter({ hasText: name }).first();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 60_000 });

  // 4. Score with the judge (per-criterion, sequential on real AI)
  await page.locator('button:has-text("Score with AI")').first().click();
  await expect(page.getByText(/need human review|criteria verified/i).first()).toBeVisible({ timeout: 120_000 });

  // 5. Go to the Scoring Review queue
  await page.goto(`${BASE_URL}/project-partner/manage/review`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Scoring Review").first()).toBeVisible({ timeout: 20_000 });

  // Reveal all candidates (real AI may have auto-published a fully-verified candidate,
  // in which case it is not in the default "flagged only" view).
  await page.locator('button:has-text("Show all candidates")').first().click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });

  // 6. Evidence + confidence UI is present
  await expect(page.locator('text=/High|Medium|Low/').first()).toBeVisible();
  await expect(page.locator('button:has-text("Approve all")').first()).toBeVisible();

  // 7. Publish the candidate
  page.on("dialog", (d) => d.accept());
  await page.locator('button:has-text("Approve all")').first().click();
  await page.waitForTimeout(3000);
});

test("Admin sees the Scoring Review menu link", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await expect(page.locator('a[href="/project-partner/manage/review"]').first()).toBeVisible({ timeout: 20_000 });
});

test("Viewer cannot see or use Scoring Review", async ({ page }) => {
  await login(page, VIEWER);
  await expect(page.locator('a[href="/project-partner/manage/review"]')).toHaveCount(0);

  await page.goto(`${BASE_URL}/project-partner/manage/review`, { waitUntil: "domcontentloaded" });
  const approveButtons = await page.locator('button:has-text("Approve all")').count();
  expect(approveButtons).toBe(0);
});
