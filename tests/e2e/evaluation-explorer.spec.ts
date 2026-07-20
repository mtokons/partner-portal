import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const GFA_EMAIL = "gfa.partner@mysccg.de";
const PASSWORD = "Portal1!";

async function login(page: Page, email: string, urlPattern: RegExp) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(urlPattern, { timeout: 30_000 });
}

test.describe("Expert evaluation explorer", () => {
  test("shows per-expert visualization, role suitability and booking controls", async ({ page }) => {
    await login(page, GFA_EMAIL, /\/project-partner/);
    await page.goto(`${BASE_URL}/project-partner/evaluation`, { waitUntil: "domcontentloaded" });

    // Explorer visualizations
    await expect(page.locator('svg[aria-label="Expert competency radar"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('svg[aria-label="Role suitability bars"]')).toBeVisible();

    // Recommended role callout
    await expect(page.locator("text=Recommended role")).toBeVisible({ timeout: 10_000 });

    // Booking controls (soft/hard) are present for the partner
    const softBook = page.locator("button", { hasText: /Soft-book/ });
    const hardBook = page.locator("button", { hasText: /Hard-book/ });
    await expect(softBook.or(page.locator("text=/Soft-booked|Hard-booked/"))).toBeVisible({ timeout: 10_000 });
    await expect(hardBook.or(page.locator("text=/Soft-booked|Hard-booked/"))).toBeVisible();
  });

  test("can select a different expert from the list", async ({ page }) => {
    await login(page, GFA_EMAIL, /\/project-partner/);
    await page.goto(`${BASE_URL}/project-partner/evaluation`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('svg[aria-label="Expert competency radar"]')).toBeVisible({ timeout: 20_000 });

    // The searchable expert selector has multiple expert buttons
    const search = page.locator('input[placeholder="Search experts…"]');
    await expect(search).toBeVisible();

    // Scope to the explorer's expert-list panel (avoid the app nav <aside>)
    const panel = page.locator('aside:has(input[placeholder="Search experts…"])');
    const selectorButtons = panel.locator("button");
    const count = await selectorButtons.count();
    expect(count).toBeGreaterThan(1);

    // Selecting the second expert keeps the radar visible
    await selectorButtons.nth(1).click();
    await expect(page.locator('svg[aria-label="Expert competency radar"]')).toBeVisible();
  });
});
