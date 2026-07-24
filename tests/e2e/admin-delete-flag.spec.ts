import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ADMIN_EMAIL = "qa.admin@mysccg.de";
const ADMIN_PASSWORD = "Portal1!";
// A known seeded test user (reversible flag toggle target)
const TEST_USER_EMAIL = "test.edukraft@mysccg.de";

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
}

test.describe("Super-admin delete & test-data flag", () => {
  // Auto-accept window.alert/confirm dialogs
  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.accept().catch(() => {}));
  });

  test("super-admin sees Delete and Flag buttons on /admin/users", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await expect(page.getByTitle("Delete user").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTitle(/flag as test data|unflag test data/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("Delete modal offers 3 options and requires typed confirmation", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await page.getByTitle("Delete user").first().click();

    // Modal + three options
    await expect(page.getByText("Only flag as test data")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Delete user account only")).toBeVisible();
    await expect(page.getByText(/Delete user AND all related records/i)).toBeVisible();

    // Select the destructive "account" option → confirm button disabled until DELETE typed
    await page.getByText("Delete user account only").click();
    const confirmBtn = page.getByRole("button", { name: /Delete Account/i });
    await expect(confirmBtn).toBeDisabled();

    await page.getByPlaceholder("Type DELETE to confirm").fill("DELETE");
    await expect(confirmBtn).toBeEnabled();

    // Cancel — do NOT actually delete anything
    await page.getByRole("button", { name: /^Cancel$/ }).click();
    await expect(page.getByText("Only flag as test data")).not.toBeVisible();
  });

  test("flag toggle marks a test user as test data and reverts", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });

    // Search to isolate the seeded test user
    await page.getByPlaceholder(/Search users/i).fill(TEST_USER_EMAIL);
    await page.waitForTimeout(1500);

    const row = page.locator("tr", { hasText: TEST_USER_EMAIL }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    const wasFlagged = (await row.getByText("Test", { exact: true }).count()) > 0;

    // Toggle once
    await row.getByTitle(/flag as test data|unflag test data/i).click();
    await page.waitForTimeout(2500);

    const nowFlagged = (await page.locator("tr", { hasText: TEST_USER_EMAIL }).first().getByText("Test", { exact: true }).count()) > 0;
    expect(nowFlagged).toBe(!wasFlagged);

    // Revert to original state
    await page.locator("tr", { hasText: TEST_USER_EMAIL }).first().getByTitle(/flag as test data|unflag test data/i).click();
    await page.waitForTimeout(2500);
  });

  test("admin overview shows Real/Test/All toggle and charts", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/overview`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: /All Data/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Real Data/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Test Data/i })).toBeVisible();

    // Switching filters keeps the page functional
    await page.getByRole("button", { name: /Test Data/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /All Data/i }).click();

    // Chart section headings render
    await expect(page.getByText(/Profit & Loss by Period/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Orders by Status/i)).toBeVisible();
  });
});
