import { chromium } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://portal.mysccg.de';
const PARTNER_EMAIL = process.env.MANUAL_PARTNER_EMAIL || 'test.edukraft@mysccg.de';
const PARTNER_PASSWORD = process.env.MANUAL_PARTNER_PASSWORD || 'Portal1!';
const CUSTOMER_EMAIL = process.env.MANUAL_CUSTOMER_EMAIL || 'qa.customer@mysccg.de';
const CUSTOMER_PASSWORD = process.env.MANUAL_CUSTOMER_PASSWORD || 'Portal1!';
const OUTPUT_DIR = 'docs/user-manual/assets';

async function login(page, { email, password, loginPath }) {
  await page.goto(`${BASE_URL}${loginPath}`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function capture(page, path, fileName, waitForText) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (waitForText) {
    await page.getByText(waitForText, { exact: false }).first().waitFor({ timeout: 15000 });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUTPUT_DIR}/${fileName}`, fullPage: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const partnerPage = await partnerContext.newPage();
  await login(partnerPage, { email: PARTNER_EMAIL, password: PARTNER_PASSWORD, loginPath: '/login' });

  await capture(partnerPage, '/partner/dashboard', 'partner-dashboard.png', 'Dashboard');
  await capture(partnerPage, '/partner/candidates', 'partner-candidates.png', 'Candidates');
  await capture(partnerPage, '/partner/offers', 'partner-offers.png', 'Offer');
  await capture(partnerPage, '/partner/tasks', 'partner-tasks.png', 'Tasks');
  await capture(partnerPage, '/partner/b2b', 'partner-b2b.png', 'My B2B Network');
  await capture(partnerPage, '/partner/finance', 'partner-finance.png', 'Finance');
  await capture(partnerPage, '/partner/marketplace', 'partner-marketplace.png', 'Marketplace');
  await capture(partnerPage, '/partner/settings', 'partner-settings.png', 'Settings');
  await capture(partnerPage, '/partner/support', 'partner-support.png', 'Support');

  await partnerContext.close();

  const customerContext = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const customerPage = await customerContext.newPage();
  await login(customerPage, { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, loginPath: '/login?portal=customer' });

  await capture(customerPage, '/customer/dashboard', 'customer-dashboard.png', 'Dashboard');
  await capture(customerPage, '/customer/offers', 'customer-offers.png', 'Offers');
  await capture(customerPage, '/customer/timeline', 'customer-timeline.png', 'Timeline');
  await capture(customerPage, '/customer/packages', 'customer-packages.png', 'Packages');
  await capture(customerPage, '/customer/school', 'customer-school.png', 'Courses');
  await capture(customerPage, '/customer/sessions', 'customer-sessions.png', 'Sessions');
  await capture(customerPage, '/customer/messages', 'customer-messages.png', 'Messages');
  await capture(customerPage, '/customer/payments', 'customer-payments.png', 'Payments');
  await capture(customerPage, '/customer/invoices', 'customer-invoices.png', 'Invoices');

  await customerContext.close();
  await browser.close();

  console.log('User manual screenshots captured in', OUTPUT_DIR);
}

run().catch((err) => {
  console.error('Failed to capture user manual screenshots:', err);
  process.exit(1);
});
