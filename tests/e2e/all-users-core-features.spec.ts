import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  label: string;
  email: string;
  password: string;
  loginPath: string;
  pages: string[];
};

const USERS: TestUser[] = [
  {
    label: "QA Admin",
    email: "qa.admin@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/admin/overview", "/admin/dashboard", "/admin/partners", "/admin/users"],
  },
  {
    label: "QA Partner",
    email: "qa.partner@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/partner/dashboard", "/partner/candidates", "/partner/offers", "/partner/tasks", "/partner/finance"],
  },
  {
    label: "QA Customer",
    email: "qa.customer@mysccg.de",
    password: "Portal1!",
    loginPath: "/login?portal=customer",
    pages: ["/customer/dashboard", "/customer/offers", "/customer/timeline", "/customer/messages", "/customer/payments"],
  },
  {
    label: "QA Expert",
    email: "qa.expert@mysccg.de",
    password: "Portal1!",
    loginPath: "/login?portal=expert",
    pages: ["/expert/dashboard", "/expert/clients", "/expert/sessions", "/expert/teaching", "/expert/payments"],
  },
  {
    label: "Edukraft Partner",
    email: "test.edukraft@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/partner/dashboard", "/partner/candidates", "/partner/offers", "/partner/tasks", "/partner/b2b", "/partner/finance", "/partner/marketplace", "/partner/settings", "/partner/support"],
  },
  {
    label: "Eduquest Partner",
    email: "test.eduquest@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/partner/dashboard", "/partner/candidates", "/partner/offers", "/partner/tasks", "/partner/b2b", "/partner/finance", "/partner/marketplace", "/partner/settings", "/partner/support"],
  },
  {
    label: "EduSeed Partner",
    email: "test.eduseed@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/partner/dashboard", "/partner/candidates", "/partner/offers", "/partner/tasks", "/partner/b2b", "/partner/finance", "/partner/marketplace", "/partner/settings", "/partner/support"],
  },
  {
    label: "Broadmind Partner",
    email: "test.broadmind@mysccg.de",
    password: "Portal1!",
    loginPath: "/login",
    pages: ["/partner/dashboard", "/partner/candidates", "/partner/offers", "/partner/tasks", "/partner/b2b", "/partner/finance", "/partner/marketplace", "/partner/settings", "/partner/support"],
  },
];

async function login(page: Page, user: TestUser) {
  await page.goto(user.loginPath);
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
}

for (const user of USERS) {
  test(`${user.label} can access core feature pages`, async ({ page }) => {
    await login(page, user);

    for (const targetPath of user.pages) {
      await page.goto(targetPath);

      await expect(page, `${user.label} redirected to login at ${targetPath}`).not.toHaveURL(/\/login/);
      await expect(page, `${user.label} landed on pending screen at ${targetPath}`).not.toHaveURL(/\/partner-pending/);

      const content = (await page.locator("body").innerText()).toLowerCase();
      expect(content, `${user.label} hit application error at ${targetPath}`).not.toContain("application error");
      expect(content, `${user.label} hit internal server error at ${targetPath}`).not.toContain("internal server error");
    }
  });
}
