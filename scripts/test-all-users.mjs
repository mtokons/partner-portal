/**
 * Comprehensive user test script
 * Tests all 6 QA users: login, dashboard load, key pages, no console errors
 * Run: node scripts/test-all-users.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const RESULTS = [];

const USERS = [
  {
    email: 'qa.admin@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/admin/overview',
    testPages: ['/admin/overview', '/admin/dashboard', '/admin/partners', '/admin/candidates', '/admin/users'],
    role: 'Admin',
  },
  {
    email: 'qa.partner@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/dashboard',
    testPages: ['/dashboard', '/partner/candidates', '/partner/candidates/new'],
    role: 'Partner',
  },
  {
    email: 'qa.customer@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/customer/dashboard',
    testPages: ['/customer/dashboard'],
    role: 'Customer (generic)',
    loginUrl: '/login?portal=customer',
  },
  {
    email: 'qa.offer@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/customer/dashboard',
    testPages: ['/customer/dashboard', '/customer/offers'],
    role: 'Candidate (offer-only)',
    loginUrl: '/login?portal=customer',
  },
  {
    email: 'qa.active@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/customer/dashboard',
    testPages: ['/customer/dashboard', '/customer/timeline'],
    role: 'Candidate (registered)',
    loginUrl: '/login?portal=customer',
  },
  {
    email: 'qa.expert@mysccg.de',
    password: 'Portal1!',
    expectedRedirect: '/expert/dashboard',
    testPages: ['/expert/dashboard'],
    role: 'Expert',
    loginUrl: '/login?portal=expert',
  },
];

async function testUser(browser, user) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const issues = [];
  const pageResults = [];

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Filter out noisy firebase/network errors that are expected
      if (!txt.includes('firebase') && !txt.includes('ResizeObserver') && !txt.includes('favicon')) {
        consoleErrors.push(txt.substring(0, 300));
      }
    }
  });

  try {
    // 1. LOGIN
    const loginUrl = user.loginUrl || '/login';
    await page.goto(`${BASE}${loginUrl}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.locator('#email').type(user.email, { delay: 30 });
    await page.locator('#password').type(user.password, { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    
    const afterLoginUrl = page.url();
    const loginSuccess = afterLoginUrl.includes(user.expectedRedirect.split('/')[1]) ||
                         !afterLoginUrl.includes('/login');
    
    if (!loginSuccess) {
      // Check for error message
      const errEl = await page.$('[role="alert"]:not(.region)');
      const errText = errEl ? await errEl.textContent() : 'Unknown';
      issues.push(`LOGIN FAILED: still at ${afterLoginUrl}. Error: ${errText}`);
    }
    
    pageResults.push({
      page: 'LOGIN',
      url: afterLoginUrl,
      ok: loginSuccess,
    });

    if (!loginSuccess) {
      await context.close();
      return { user: user.role, email: user.email, issues, pageResults, consoleErrors: consoleErrors.slice(0, 3) };
    }

    // 2. TEST PAGES
    for (const path of user.testPages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      
      // Check if we got redirected to login (access denied)
      const accessDenied = url.includes('/login') || url.includes('/unauthorized');
      
      // Check for error page / Next.js error boundary
      const pageContent = await page.evaluate(() => {
        const h1 = document.querySelector('h1, h2');
        const isError = document.title.includes('Error') || 
                        document.body.innerText.includes('Application error') ||
                        document.body.innerText.includes('Internal Server Error');
        return { h1Text: h1?.textContent?.trim(), isError };
      });
      
      pageResults.push({
        page: path,
        url,
        ok: !accessDenied && !pageContent.isError,
        note: accessDenied ? 'ACCESS DENIED → redirected to login' : 
              pageContent.isError ? 'SERVER ERROR on page' : null,
        h1: pageContent.h1Text,
      });
      
      if (accessDenied) issues.push(`ACCESS DENIED on ${path}`);
      if (pageContent.isError) issues.push(`SERVER ERROR on ${path}`);
    }
    
  } catch (err) {
    issues.push(`EXCEPTION: ${err.message}`);
  }

  await context.close();
  return {
    user: user.role,
    email: user.email,
    issues,
    pageResults,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
  };
}

async function main() {
  console.log('🧪  Testing all QA users...\n');
  const browser = await chromium.launch({ headless: true });
  
  for (const user of USERS) {
    process.stdout.write(`  Testing ${user.role} (${user.email})...`);
    const result = await testUser(browser, user);
    RESULTS.push(result);
    const ok = result.issues.length === 0;
    console.log(ok ? ' ✅' : ' ❌');
    if (!ok) {
      result.issues.forEach(i => console.log(`    ⚠️  ${i}`));
    }
    for (const pr of result.pageResults) {
      const icon = pr.ok ? '✓' : '✗';
      console.log(`    ${icon} ${pr.page} → ${pr.url}${pr.note ? ' [' + pr.note + ']' : ''}`);
    }
    if (result.consoleErrors.length > 0) {
      console.log(`    Console errors: ${result.consoleErrors.length}`);
      result.consoleErrors.slice(0, 2).forEach(e => console.log(`      - ${e.substring(0, 150)}`));
    }
    console.log();
  }
  
  await browser.close();
  
  console.log('\n═══════════════════════════════════════');
  const passing = RESULTS.filter(r => r.issues.length === 0).length;
  const total = RESULTS.length;
  console.log(`  RESULTS: ${passing}/${total} users fully working`);
  
  const failing = RESULTS.filter(r => r.issues.length > 0);
  if (failing.length > 0) {
    console.log('\n  ❌ ISSUES TO FIX:');
    failing.forEach(r => {
      console.log(`  [${r.user}] ${r.email}`);
      r.issues.forEach(i => console.log(`    - ${i}`));
    });
  }
  console.log('═══════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
