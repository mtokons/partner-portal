import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "Portal1!";

const PARTNERS = [
  { name: "Edukraft", email: "test.edukraft@mysccg.de" },
  { name: "Eduquest", email: "test.eduquest@mysccg.de" },
  { name: "EduSeed", email: "test.eduseed@mysccg.de" },
  { name: "Broadmind", email: "test.broadmind@mysccg.de" },
];

const PARTNER_FEATURE_PATHS = [
  "/partner/dashboard",
  "/partner/candidates",
  "/partner/candidates/new",
  "/partner/offers",
  "/partner/tasks",
  "/partner/b2b",
  "/partner/finance",
  "/partner/marketplace",
  "/partner/settings",
  "/partner/support",
];

async function loginAsPartner(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.keyboard.press("Enter");

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await expect(page).not.toHaveURL(/\/login/);
}

for (const partner of PARTNERS) {
  test(`${partner.name} can log in and access partner feature pages`, async ({ page }) => {
    await loginAsPartner(page, partner.email);

    for (const path of PARTNER_FEATURE_PATHS) {
      await page.goto(path);

      await expect(page, `Expected ${partner.name} to stay off login for ${path}`).not.toHaveURL(/\/login/);
      await expect(page, `Expected ${partner.name} to avoid pending state for ${path}`).not.toHaveURL(/\/partner-pending/);

      const bodyText = await page.locator("body").innerText();
      expect(bodyText.toLowerCase(), `Expected ${partner.name} page ${path} to load without server error`).not.toContain("application error");
      expect(bodyText.toLowerCase(), `Expected ${partner.name} page ${path} to load without server error`).not.toContain("internal server error");
    }
  });
}
