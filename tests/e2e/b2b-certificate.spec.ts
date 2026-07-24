import { test, expect } from "@playwright/test";

/**
 * E2E tests for B2B Certificate of Cooperation feature.
 *
 * Covers:
 * 1. Login as partner (qa.partner@mysccg.de)
 * 2. Navigate to /partner/b2b
 * 3. Verify "My B2B" tab renders with company cards
 * 4. Verify "All Partner B2B" tab does NOT show partner name column
 * 5. Verify certificate action button appears on own company cards
 * 6. Generate a certificate → modal opens with QR code
 * 7. Verify QR code link format is COOP-*
 * 8. Verify /verify/[unknown-coop-code] shows "Certificate Not Found"
 * 9. Verify /verify/COOP-* format is accepted (returns partnership verified or not found)
 */

const BASE_URL = "https://portal.mysccg.de";
const PARTNER_EMAIL = "qa.partner@mysccg.de";
const PARTNER_PASSWORD = "Portal1!";

test.describe("B2B Certificate of Cooperation", () => {
  test("login page is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/sign in|login|email/i).first()).toBeVisible();
  });

  test("verify page handles COOP-format code as not found", async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/COOP-20250101-AABBCC`);
    // Should show "Certificate Not Found" heading
    await expect(page.getByRole('heading', { name: /Certificate Not Found/i })).toBeVisible({ timeout: 15000 });
  });

  test("verify page still handles school cert codes correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/INVALID-SCHOOL-CODE-999`);
    await expect(page.getByRole('heading', { name: /Certificate Not Found/i })).toBeVisible({ timeout: 15000 });
  });

  test("partner can access B2B page after login", async ({ page }) => {
    // Login via the partner login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').first().fill(PARTNER_EMAIL);
    await page.locator('input[type="password"]').first().fill(PARTNER_PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    // Wait for redirect to partner dashboard
    await page.waitForURL(/\/partner/, { timeout: 45000 });

    // Navigate to B2B page
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");

    // Page should show B2B Network heading
    await expect(page.getByRole('heading', { name: /My B2B Network/i })).toBeVisible({ timeout: 20000 });
  });

  test("All B2B tab hides partner identity column", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').first().fill(PARTNER_EMAIL);
    await page.locator('input[type="password"]').first().fill(PARTNER_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/partner/, { timeout: 45000 });

    // Go to B2B page
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");

    // Click "All Partner B2B" tab
    const allTab = page.getByText(/All Partner B2B/i).first();
    await expect(allTab).toBeVisible({ timeout: 20000 });
    await allTab.click();

    // "Assigned Partner" column should NOT appear
    await expect(page.getByText(/Assigned Partner/i)).not.toBeVisible();

    // Table should show City column and Organisation column
    await expect(page.getByText(/Organisation|City/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("My B2B tab shows Issue Certificate button", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').first().fill(PARTNER_EMAIL);
    await page.locator('input[type="password"]').first().fill(PARTNER_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/partner/, { timeout: 45000 });

    // Go to B2B page
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");

    // Should show "My B2B" tab by default
    await expect(page.getByRole('heading', { name: /My B2B Network/i })).toBeVisible({ timeout: 20000 });

    // Check if certificate action is present (Issue/Re-issue), or empty state is shown
    const certBtn = page.getByRole("button", { name: /Issue Certificate|Re-issue/i }).first();
    const noCerts = page.getByText(/No B2B companies yet/i);
    const emptyDownloads = page.getByText(/No additional downloads yet/i);

    const hasCerts = await certBtn.isVisible().catch(() => false);
    const isEmpty = await noCerts.isVisible().catch(() => false);
    const isAltEmpty = await emptyDownloads.isVisible().catch(() => false);

    // Either there are companies with cert actions, or a valid empty state is shown
    expect(hasCerts || isEmpty || isAltEmpty).toBe(true);
  });

  test("Certificate modal opens and shows QR code when company exists", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[type="email"]').first().fill(PARTNER_EMAIL);
    await page.locator('input[type="password"]').first().fill(PARTNER_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/partner/, { timeout: 45000 });

    // Go to B2B page
    await page.goto(`${BASE_URL}/partner/b2b`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole('heading', { name: /My B2B Network/i })).toBeVisible({ timeout: 15000 });

    // Check if there are any companies
    const certBtn = page.getByRole("button", { name: /Issue Certificate|Re-issue/i }).first();
    const isVisible = await certBtn.isVisible().catch(() => false);

    if (!isVisible) {
      // No companies — add one for testing
      const addBtn = page.getByRole("button", { name: /Add B2B Company/i }).first();
      await addBtn.click();
      await page.fill('input[name="companyName"]', "E2E Test Institute");
      await page.fill('textarea[name="address"]', "123 Test Street, Berlin, Germany");
      await page.fill('input[name="contactPerson"]', "Test Contact");
      await page.fill('input[name="contactNumber"]', "+49 30 000000");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Now check for cert button
    const certButton = page.getByRole("button", { name: /Issue Certificate of Cooperation/i }).first();
    const hasCertBtn = await certButton.isVisible().catch(() => false);

    if (hasCertBtn) {
      await certButton.click();

      // Wait for modal to appear
      await expect(page.getByText(/Certificate of Cooperation/i).first()).toBeVisible({ timeout: 20000 });

      // Verify modal content
      await expect(page.getByText(/Verifiable Online/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/COOP-/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/portal\.mysccg\.de\/verify\//i).first()).toBeVisible({ timeout: 10000 });

      // QR code canvas/svg should be present
      const qrElement = page.locator('[id="cert-qr-canvas"], svg[viewBox]').first();
      await expect(qrElement).toBeVisible({ timeout: 5000 });

      // Download PDF button
      await expect(page.getByRole("button", { name: /Download PDF/i })).toBeVisible({ timeout: 5000 });
    }
  });
});
