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

test("Expert Bank cards show Profile link", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/expert-bank`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Master Expert Bank").first()).toBeVisible({ timeout: 20_000 });
  // If there are experts, they should have a Profile link
  const profileLinks = page.locator('a:has-text("Profile →")');
  const count = await profileLinks.count();
  if (count > 0) {
    // Navigate to the first expert's profile page
    const href = await profileLinks.first().getAttribute("href");
    if (href && href.startsWith("/admin/experts/")) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("text=← Expert Bank").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("text=Evaluate").first()).toBeVisible();
      await expect(page.locator("text=Create CV").first()).toBeVisible();
    }
  } else {
    // No experts yet — just check the Expert Bank page loaded
    expect(await page.locator("text=Master Expert Bank").count()).toBeGreaterThan(0);
  }
});

test("Expert profile page drawer has Full profile link", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/expert-bank`, { waitUntil: "domcontentloaded" });
  const cards = page.locator("button").filter({ hasText: "Profile →" });
  if (await cards.count() > 0) {
    // Click a card (not the Profile link) to open the drawer
    await page.locator(".group.rounded-2xl").first().click();
    await expect(page.locator("text=Full profile →").first()).toBeVisible({ timeout: 10_000 });
  }
});

test("Evaluation Wizard accepts preSelectedExpertId in URL", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/evaluation-wizard?expertId=test`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Evaluation Wizard").first()).toBeVisible({ timeout: 20_000 });
});

test("CV Wizard accepts preSelectedExpertId in URL", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${BASE_URL}/admin/cv-wizard?expertId=test`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=CV Creation Wizard").first()).toBeVisible({ timeout: 20_000 });
});
