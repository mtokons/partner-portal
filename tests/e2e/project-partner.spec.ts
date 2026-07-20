import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const GFA_EMAIL = "gfa.partner@mysccg.de";
const ADMIN_EMAIL = "qa.admin@mysccg.de";
const PASSWORD = "Portal1!";

async function login(page: Page, email: string, urlPattern: RegExp) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(urlPattern, { timeout: 30_000 });
}

test("GFA project partner sees console, project and staffing matrix", async ({ page }) => {
  await login(page, GFA_EMAIL, /\/project-partner/);
  await expect(page.locator("text=Projects").first()).toBeVisible();

  await page.goto(`${BASE_URL}/project-partner/projects`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=GIZ Bangladesh TVET4RE").first()).toBeVisible({ timeout: 20_000 });

  await page.goto(`${BASE_URL}/project-partner/matrix`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Expert Staffing Matrix").first()).toBeVisible();
});

test("GFA can open Evaluation Matrix and inspect an expert", async ({ page }) => {
  await login(page, GFA_EMAIL, /\/project-partner/);

  await page.goto(`${BASE_URL}/project-partner/evaluation`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Evaluation Matrix").first()).toBeVisible({ timeout: 20_000 });

  // Per-expert explorer renders the competency radar for the first expert
  await expect(page.locator('svg[aria-label="Expert competency radar"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('svg[aria-label="Role suitability bars"]')).toBeVisible();

  // KPI summary present
  await expect(page.locator("text=Experts evaluated").first()).toBeVisible();

  // Collapsed full matrix overview still available
  await expect(page.locator("text=Show full matrix overview")).toBeVisible();
});

test("Admin can open Project Partners management", async ({ page }) => {
  await login(page, ADMIN_EMAIL, /\/admin/);
  await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Project Partners").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=TVET4RE").first()).toBeVisible();
});
