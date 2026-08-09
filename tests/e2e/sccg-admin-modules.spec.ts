import { expect, test, type Page } from "@playwright/test";

const SCCG_EMAIL = process.env.E2E_SCCG_ADMIN_EMAIL || "rabiul@mysccg.de";
const SCCG_PASSWORD = process.env.E2E_SCCG_ADMIN_PASSWORD || "Portal1!";
const PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL || "qa.partner@mysccg.de";
const PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD || "Portal1!";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
}

test.describe.serial("SCCG Admin operational modules", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SCCG_EMAIL, SCCG_PASSWORD);
  });

  test("role dispatch lands in the SCCG console", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/sccg\//, { timeout: 20_000 });
  });

  const routes = [
    ["/sccg/candidates", /Candidate Gallery/i],
    ["/sccg/candidates/new", /Register Candidate/i],
    ["/sccg/hr", /Human Resources/i],
    ["/sccg/hr/employees", /Employees/i],
    ["/sccg/hr/employees/new", /Add Employee/i],
    ["/sccg/school", /Language School/i],
    ["/sccg/school/courses", /Courses/i],
    ["/sccg/school/batches", /Batches/i],
    ["/sccg/school/enrollments", /Enrollments/i],
    ["/sccg/school/teachers", /Teachers/i],
    ["/sccg/school/certificates", /Certificates/i],
    ["/sccg/finance", /Finance Overview/i],
    ["/sccg/finance/invoices", /Invoices/i],
    ["/sccg/finance/payments", /Payment Ledger/i],
    ["/sccg/finance/payouts", /Payouts/i],
    ["/sccg/finance/expenses", /Expenses/i],
    ["/sccg/finance/reports", /Finance Reports/i],
  ] as const;

  for (const [route, heading] of routes) {
    test(`${route} renders its operational view`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }

  test("candidate registration exposes the full wizard", async ({ page }) => {
    await page.goto("/sccg/candidates/new");
    await expect(page.getByText("Personal Info", { exact: true })).toBeVisible();
    await expect(page.getByText("Financial Split", { exact: true })).toBeVisible();
  });

  test("HR creation exposes required employee lifecycle fields", async ({ page }) => {
    await page.goto("/sccg/hr/employees/new");
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('select[name="department"]')).toBeVisible();
    await expect(page.locator('select[name="employmentType"]')).toBeVisible();
  });

  test("school certificate view exposes eligibility and issued credentials", async ({ page }) => {
    await page.goto("/sccg/school/certificates");
    await expect(page.getByRole("heading", { name: "Eligible enrollments" })).toBeVisible();
  });

  test("finance expenses exposes validated recording fields", async ({ page }) => {
    await page.goto("/sccg/finance/expenses");
    await expect(page.locator('input[name="category"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
    await expect(page.locator('input[name="date"]')).toBeVisible();
  });
});

test("partner cannot open SCCG-owned module routes", async ({ page }) => {
  await login(page, PARTNER_EMAIL, PARTNER_PASSWORD);
  await page.goto("/sccg/hr");
  await expect(page).not.toHaveURL(/\/sccg\/hr$/);
});

test("public certificate verification route remains reachable", async ({ page }) => {
  const response = await page.goto("/verify/non-existent-certificate", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/certificate|verification|not found/i);
});
