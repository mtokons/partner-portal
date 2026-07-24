import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ORG_ADMIN = "admin.educraft@mysccg.de";
const PASSWORD = "Portal1!";

async function login(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/project-partner/, { timeout: 30_000 });
}

test("Org admin can replace an existing expert's CV and re-map it", async ({ page }) => {
  test.setTimeout(180_000);
  const name = `Replace QA ${Date.now()}`;
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/intake`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=AI CV Intake").first()).toBeVisible({ timeout: 20_000 });

  // Create an entry
  await page.locator('#expertName').fill(name);
  await page.locator('#rawText').fill("Initial CV. Bachelor degree. 3 years experience. English B2.");
  await page.locator('button:has-text("Extract with")').first().click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 60_000 });

  // Reveal the Replace CV form on the newest candidate's card (sorted newest-first)
  await page.locator('button:has-text("Replace CV")').first().click();

  // Paste a corrected CV into the replace form (scoped so we don't hit the top upload box) and re-map
  const replaceForm = page.locator('form:has(button:has-text("Replace & re-map"))').first();
  await replaceForm.locator('textarea[name="rawText"]').fill("Corrected CV. Master degree in vocational education. 12 years TVET curriculum experience. English C1, Bangla mother tongue.");
  await replaceForm.locator('button:has-text("Replace & re-map")').click();

  // Confirmation of re-mapping
  await expect(page.getByText(/Replaced CV and re-mapped/i).first()).toBeVisible({ timeout: 60_000 });
});
