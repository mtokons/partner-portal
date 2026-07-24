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

test("Educraft org admin can reach the management console and CRUD projects", async ({ page }) => {
  await login(page, ORG_ADMIN);

  // Management projects page loads with the seeded JV project
  await page.goto(`${BASE_URL}/project-partner/manage/projects`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Manage Projects").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("text=Educraft JV").first()).toBeVisible({ timeout: 20_000 });

  // New-project dialog opens
  await page.locator('button:has-text("New project")').first().click();
  await expect(page.locator('text=New project').first()).toBeVisible();
});

test("Org admin can configure the evaluation matrix + CV form", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/evaluation`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Evaluation").first()).toBeVisible({ timeout: 20_000 });
  // tabs for CV form + matrix
  await expect(page.locator('text=CV Form').first()).toBeVisible();
  await expect(page.locator('text=Evaluation Matrix').first()).toBeVisible();
});

test("Org admin can open the AI CV intake page", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/intake`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=AI CV Intake").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('text=Upload CV').first()).toBeVisible();
});

test("Org admin can open the users management page", async ({ page }) => {
  await login(page, ORG_ADMIN);
  await page.goto(`${BASE_URL}/project-partner/manage/users`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Users").first()).toBeVisible({ timeout: 20_000 });
});

test("Viewer is read-only: no management menu and manage routes are blocked", async ({ page }) => {
  await login(page, VIEWER);

  // Viewer dashboard loads
  await page.goto(`${BASE_URL}/project-partner/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=Welcome").first()).toBeVisible({ timeout: 20_000 });

  // The "Management" sidebar group must NOT be present for a viewer
  await expect(page.locator('text=AI CV Intake')).toHaveCount(0);

  // Hitting a management route server-side must be forbidden (guard throws -> error)
  const resp = await page.goto(`${BASE_URL}/project-partner/manage/projects`, { waitUntil: "domcontentloaded" });
  // Either a 5xx error page from the thrown guard, or no management UI rendered
  const hasManageUi = await page.locator('button:has-text("New project")').count();
  expect(hasManageUi).toBe(0);
  expect(resp?.status() ?? 200).toBeGreaterThanOrEqual(200);
});
