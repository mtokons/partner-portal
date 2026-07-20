import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL || "qa.partner@mysccg.de";
const PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD || "Portal1!";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "qa.admin@mysccg.de";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Portal1!";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(partner|admin|customer|expert)/, { timeout: 45_000 });
}

test.describe("Admin visibility controls", () => {
  test("B2B certificate template button is admin-only", async ({ page, browser }) => {
    await login(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /My B2B Network/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Certificate Template/i })).toHaveCount(0);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/partner/b2b`);
    await adminPage.waitForLoadState("domcontentloaded");

    const certTplBtn = adminPage.getByRole("button", { name: /Certificate Template|Template/i });
    await expect(certTplBtn).toBeVisible({ timeout: 20_000 });
    await certTplBtn.click();
    await expect(adminPage.getByRole("heading", { name: /Certificate of Cooperation/i })).toBeVisible({ timeout: 10_000 });

    await adminContext.close();
  });

  test("B2B add-company modal includes indirect partner logo upload", async ({ page }) => {
    await login(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /Add B2B Company/i }).first().click();
    await expect(page.getByRole("heading", { name: /Add B2B Company/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Click to upload PNG, JPG or WebP/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="file"][accept*="image/png"]').first()).toBeAttached();
  });

  test("Marketplace upload button in downloads tab is admin-only", async ({ page, browser }) => {
    await login(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await page.goto(`${BASE_URL}/partner/marketplace`);
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /Downloads & Resources/i }).click();
    await page.getByRole("button", { name: /Other Downloads/i }).click();
    await expect(page.getByRole("button", { name: /Upload Resource/i })).toHaveCount(0);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/partner/marketplace`);
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage.getByRole("button", { name: /Downloads & Resources/i }).click();
    await adminPage.getByRole("button", { name: /Other Downloads/i }).click();
    await expect(adminPage.getByRole("button", { name: /Upload Resource/i })).toBeVisible({ timeout: 15_000 });

    await adminContext.close();
  });
});
