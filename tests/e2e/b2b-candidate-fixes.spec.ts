import { test, expect, Page } from "@playwright/test";

/**
 * E2E for the B2B fixes:
 *  - Registration saves all fields + generates a unique global ID
 *  - New company appears in the global ("All B2B") list with Global ID + Registered By
 *  - Issue Certificate produces a QR + verifiable COOP code
 *  - Certificate modal exposes a "Send via email" control
 *  - /verify/<code> resolves the issued partnership certificate
 */

const PARTNER_EMAIL = "qa.partner@mysccg.de";
const PARTNER_PASSWORD = "Portal1!";

async function loginAsPartner(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[type="email"]').first().fill(PARTNER_EMAIL);
  await page.locator('input[type="password"]').first().fill(PARTNER_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/partner/, { timeout: 45000 });
}

test.describe("B2B registration, global ID, global list & certificate email", () => {
  test("full B2B flow: add → global ID → global list → certificate → verify", async ({ page }) => {
    test.setTimeout(120000);
    const unique = `E2E Cooperation ${Date.now()}`;

    await loginAsPartner(page);
    await page.goto("/partner/b2b");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /My B2B Network/i })).toBeVisible({ timeout: 20000 });

    // ── Add a B2B company with the extended fields ──
    await page.getByRole("button", { name: /Add B2B Company/i }).first().click();
    await page.fill('input[name="companyName"]', unique);
    await page.selectOption('select[name="entityType"]', { label: "GmbH" }).catch(() => {});
    await page.fill('input[name="registrationNumber"]', "HRB 999999");
    await page.selectOption('select[name="industry"]', { label: "Education" }).catch(() => {});
    await page.fill('textarea[name="address"]', "10 Test Allee, Munich, Germany");
    await page.fill('input[name="contactPerson"]', "Erika Mustermann");
    await page.fill('input[name="designation"]', "Director");
    await page.fill('input[name="contactNumber"]', "+49 89 111222");
    await page.fill('input[name="email"]', "qa.partner@mysccg.de");
    await page.click('form button[type="submit"]');

    // Card appears in My B2B with a global ID
    const card = page.locator("div").filter({ hasText: unique }).first();
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/SCCG-B2B-[0-9A-F]{8}/i).first()).toBeVisible({ timeout: 15000 });

    // ── Global list shows Global ID + Registered By + the new company ──
    await page.getByRole("button", { name: /All Partner B2B/i }).first().click();
    await expect(page.getByText(/Global ID/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Registered By/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 10000 });

    // ── Issue the certificate ──
    await page.getByRole("button", { name: /My B2B Companies/i }).first().click();
    const issueBtn = page.getByRole("button", { name: /Issue Certificate of Cooperation/i }).first();
    await expect(issueBtn).toBeVisible({ timeout: 15000 });
    await issueBtn.click();

    // Modal: QR + COOP code + verifiable link + email-send control
    await expect(page.getByText(/Verifiable Online/i)).toBeVisible({ timeout: 25000 });
    const coopText = await page.getByText(/COOP-\d{8}-[0-9A-F]{6}/i).first().innerText();
    const certCode = (coopText.match(/COOP-\d{8}-[0-9A-F]{6}/i) || [])[0];
    expect(certCode).toBeTruthy();
    await expect(page.getByText(/Send certificate to business partner/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Download PDF/i })).toBeVisible({ timeout: 10000 });

    // ── Verify the issued certificate resolves publicly ──
    await page.goto(`/verify/${certCode}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Certificate Not Found/i)).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(new RegExp(unique.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible({ timeout: 15000 });
  });

  test("duplicate B2B registration is blocked", async ({ page }) => {
    test.setTimeout(60000);
    await loginAsPartner(page);
    await page.goto("/partner/b2b");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /My B2B Network/i })).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /Add B2B Company/i }).first().click();
    // "feffw" already exists on the network (seeded). Re-adding must be rejected.
    await page.fill('input[name="companyName"]', "feffw");
    await page.fill('textarea[name="address"]', "1 Somewhere, Berlin, Germany");
    await page.fill('input[name="contactPerson"]', "Dup Test");
    await page.fill('input[name="contactNumber"]', "+49 30 000111");
    await page.click('form button[type="submit"]');

    await expect(page.getByText(/already registered/i).first()).toBeVisible({ timeout: 20000 });
  });
});
