import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://portal.mysccg.de";
const ADMIN_EMAIL = "qa.admin@mysccg.de";
const ADMIN_PASSWORD = "Portal1!";

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
}

test.describe("Admin impersonation — View As User", () => {
  test("admin/users table has View As column and buttons", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });

    // Column header exists
    await expect(page.getByRole("columnheader", { name: /View As/i })).toBeVisible({ timeout: 20_000 });

    // At least one View As button exists
    const viewBtns = page.getByRole("button", { name: /View As/i });
    await expect(viewBtns.first()).toBeVisible({ timeout: 15_000 });
  });

  test("clicking View As a partner user activates impersonation and shows banner", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("columnheader", { name: /View As/i })).toBeVisible({ timeout: 20_000 });

    // Load all users — find a partner-role user
    await page.waitForTimeout(2000);

    // Click first available View As button
    const firstViewBtn = page.getByRole("button", { name: /View As/i }).first();
    await expect(firstViewBtn).toBeVisible({ timeout: 10_000 });
    await firstViewBtn.click();

    // Should redirect away from admin/users
    await page.waitForURL(/\/(partner|customer|expert|student|admin)/, { timeout: 30_000 });

    // Impersonation banner should be visible
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/is viewing as/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Exit.*Return to Admin/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Exit impersonation returns admin to admin/users", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("columnheader", { name: /View As/i })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: /View As/i }).first().click();
    await page.waitForURL(/\/(partner|customer|expert|student|admin)/, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Exit.*Return to Admin/i })).toBeVisible({ timeout: 10_000 });

    // Exit impersonation
    await page.getByRole("button", { name: /Exit.*Return to Admin/i }).click();
    await page.waitForURL(/\/admin\/users/, { timeout: 20_000 });

    // Banner should be gone
    await expect(page.getByText(/is viewing as/i)).not.toBeVisible();
  });
});

/**
 * Regression: "View As" must load the TARGET user's own console for EVERY role,
 * not only partner. Previously dashboards keyed off the admin's own identity, so
 * impersonating an expert/customer/student rendered an empty/pending screen.
 */
test.describe("Admin impersonation — all roles load target console", () => {
  const ROLE_CONSOLE: Record<string, RegExp> = {
    partner: /\/partner\/dashboard/,
    customer: /\/customer\/dashboard/,
    expert: /\/expert\/dashboard/,
    student: /\/student\/dashboard/,
  };

  /** Build a map of role -> { rowIndex, email } from the users table. */
  async function indexRowsByRole(page: Page): Promise<Record<string, { index: number; email: string }>> {
    const rows = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: /View As/i }) });
    const count = await rows.count();
    const map: Record<string, { index: number; email: string }> = {};
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const primaryRole = (await row.locator("td").nth(1).innerText()).trim().toLowerCase();
      const cellText = await row.locator("td").nth(0).innerText();
      const email = (cellText.match(/[\w.+-]+@[\w.-]+/) || [""])[0];
      if (primaryRole && !map[primaryRole]) map[primaryRole] = { index: i, email };
    }
    return map;
  }

  for (const role of ["partner", "customer", "expert", "student"]) {
    test(`View As a ${role} opens the ${role} console for that user`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("columnheader", { name: /View As/i })).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2500); // allow client-side user list to load

      const map = await indexRowsByRole(page);
      const entry = map[role];
      test.skip(!entry, `No ${role}-role user available to impersonate`);

      const rows = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: /View As/i }) });
      await rows.nth(entry!.index).getByRole("button", { name: /View As/i }).click();

      // Lands on THIS role's console — not bounced to admin or a login page.
      await page.waitForURL(ROLE_CONSOLE[role], { timeout: 30_000 });
      expect(page.url()).not.toMatch(/\/login|\/customer-login|\/expert-login/);
      expect(page.url()).not.toMatch(/\/admin\//);

      // Impersonation banner confirms we are viewing AS the target user.
      await expect(page.getByText(/is viewing as/i)).toBeVisible({ timeout: 15_000 });
      if (entry!.email) {
        await expect(page.getByText(entry!.email, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
      }

      // Exit cleanly back to admin.
      await page.getByRole("button", { name: /Exit.*Return to Admin/i }).click();
      await page.waitForURL(/\/admin\/users/, { timeout: 20_000 });
    });
  }
});

/**
 * Regression: while impersonating, SUB-PAGES (not just the dashboard) must load
 * the target's console without bouncing the admin back to a role login page.
 * Previously customer/expert/student layouts and ~15 sub-pages read identity
 * from auth() (the admin's session) and redirected to /customer-login etc.
 */
test.describe("Admin impersonation — sub-pages stay in target console", () => {
  // role -> a representative sub-route that previously bounced to login
  const ROLE_SUBPAGE: Record<string, string> = {
    partner: "/partner/finance",
    customer: "/customer/packages",
    expert: "/expert/sessions",
    student: "/student/dashboard",
  };

  async function indexRowsByRole(page: Page): Promise<Record<string, { index: number; email: string }>> {
    const rows = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: /View As/i }) });
    const count = await rows.count();
    const map: Record<string, { index: number; email: string }> = {};
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const primaryRole = (await row.locator("td").nth(1).innerText()).trim().toLowerCase();
      const cellText = await row.locator("td").nth(0).innerText();
      const email = (cellText.match(/[\w.+-]+@[\w.-]+/) || [""])[0];
      if (primaryRole && !map[primaryRole]) map[primaryRole] = { index: i, email };
    }
    return map;
  }

  for (const role of ["partner", "customer", "expert"]) {
    test(`Impersonated ${role} can open a sub-page without being logged out`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("columnheader", { name: /View As/i })).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2500);

      const map = await indexRowsByRole(page);
      const entry = map[role];
      test.skip(!entry, `No ${role}-role user available to impersonate`);

      const rows = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: /View As/i }) });
      await rows.nth(entry!.index).getByRole("button", { name: /View As/i }).click();
      await page.waitForURL(new RegExp(`/${role}/dashboard`), { timeout: 30_000 });

      // Navigate directly to a protected sub-page of the same console.
      await page.goto(`${BASE_URL}${ROLE_SUBPAGE[role]}`, { waitUntil: "domcontentloaded" });

      // Must NOT be redirected to any login page; must remain in the role console.
      expect(page.url()).not.toMatch(/\/login|\/customer-login|\/expert-login/);
      expect(page.url()).toContain(`/${role}/`);

      // Impersonation banner still present (still acting as target).
      await expect(page.getByText(/is viewing as/i)).toBeVisible({ timeout: 15_000 });

      // Clean exit.
      await page.getByRole("button", { name: /Exit.*Return to Admin/i }).click();
      await page.waitForURL(/\/admin\/users/, { timeout: 20_000 });
    });
  }
});


