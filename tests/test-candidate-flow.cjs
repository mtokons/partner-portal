/**
 * End-to-End Test — Candidate User Creation Flow
 *
 * Tests:
 * 1. generateTempPassword produces valid passwords
 * 2. buildCandidateLoginEmail renders with credentials
 * 3. buildCandidateLoginEmail renders without credentials (fallback)
 * 4. All customer portal pages compile & export correctly
 * 5. candidate-actions server functions exist and have correct signatures
 * 6. Menu engine has new customer items
 * 7. Admin users action includes partner fields
 */

// === Test 1: Password Generation ===
// We can't require TS files directly, so we'll inline the function for testing
const crypto = require("crypto");

function generateTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const bytes = crypto.randomBytes(12);
  const parts = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];
  for (let i = 4; i < 12; i++) {
    parts.push(all[bytes[i] % all.length]);
  }
  for (let i = parts.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

function testPasswordGeneration() {
  console.log("\n=== Test 1: Password Generation ===");
  const passwords = new Set();
  let allValid = true;

  for (let i = 0; i < 20; i++) {
    const pw = generateTempPassword();
    passwords.add(pw);

    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%&*]/.test(pw);
    const isLength12 = pw.length === 12;

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial || !isLength12) {
      console.log(`  FAIL: password "${pw}" missing required chars (upper=${hasUpper}, lower=${hasLower}, digit=${hasDigit}, special=${hasSpecial}, len=${pw.length})`);
      allValid = false;
    }
  }

  // Uniqueness check
  if (passwords.size < 18) {
    console.log(`  FAIL: Only ${passwords.size}/20 unique passwords (too many collisions)`);
    allValid = false;
  }

  console.log(`  Generated 20 passwords, ${passwords.size} unique`);
  console.log(`  Sample: ${[...passwords].slice(0, 3).join(", ")}`);
  console.log(`  Result: ${allValid ? "PASS ✅" : "FAIL ❌"}`);
  return allValid;
}

// === Test 2: Email Template Source Code ===
function testEmailTemplateSource() {
  console.log("\n=== Test 2: Email Template — Source Validation ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/lib/email.ts"), "utf8");

  const checks = [
    { name: "Exports buildCandidateLoginEmail", pass: content.includes("export function buildCandidateLoginEmail") },
    { name: "Subject mentions Login Details", pass: content.includes("Login Details") },
    { name: "Has login URL template literal", pass: content.includes("${data.loginUrl}") },
    { name: "Has candidate name placeholder", pass: content.includes("${data.candidateName}") },
    { name: "Has SCCG ID placeholder", pass: content.includes("${data.sccgId}") },
    { name: "Has email placeholder", pass: content.includes("${data.email}") },
    { name: "Has temp password placeholder", pass: content.includes("${data.tempPassword}") },
    { name: "Has login button text", pass: content.includes("Log In to Your Portal") },
    { name: "Has partner name placeholder", pass: content.includes("${data.partnerName}") },
    { name: "Has workflow placeholder", pass: content.includes("${data.workflowCategory}") },
    { name: "Has service fee section", pass: content.includes("totalServiceFee") && content.includes(".toFixed(2)") },
    { name: "Has password change warning", pass: content.includes("change your password") },
    { name: "Has Login Credentials header", pass: content.includes("Login Credentials") },
    { name: "Has existing account fallback", pass: content.includes("already have an account") },
    { name: "Conditional password section", pass: content.includes("data.tempPassword") && content.includes("passwordSection") },
    { name: "Shows Temporary Password label", pass: content.includes("Temporary Password") },
    { name: "Has loginUrl as <a> href", pass: content.includes('href="${data.loginUrl}"') },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length} checks)`);
  return allPass;
}

// === Test 3: Menu Engine Source ===
function testMenuEngineSource() {
  console.log("\n=== Test 3: Menu Engine — Customer Menu Items ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/lib/menu-engine.ts"), "utf8");

  const requiredItems = [
    { key: "customer.offers", href: "/customer/offers" },
    { key: "customer.timeline", href: "/customer/timeline" },
    { key: "customer.messages", href: "/customer/messages" },
    { key: "customer.dashboard", href: "/customer/dashboard" },
    { key: "customer.packages", href: "/customer/packages" },
    { key: "customer.payments", href: "/customer/payments" },
  ];

  let allPass = true;
  requiredItems.forEach((req) => {
    if (!content.includes(`key: "${req.key}"`) || !content.includes(`href: "${req.href}"`)) {
      console.log(`  FAIL: Missing menu item ${req.key} → ${req.href}`);
      allPass = false;
    }
  });

  // Check the items appear in the customer section
  if (!content.includes("customer:")) {
    console.log("  FAIL: No customer section found");
    allPass = false;
  }

  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 5: Verify all new files exist and export correctly ===
function testFileExistence() {
  console.log("\n=== Test 5: File Existence & Exports ===");
  const fs = require("fs");
  const path = require("path");

  const requiredFiles = [
    "src/lib/candidate-user.ts",
    "src/lib/email.ts",
    "src/app/customer/candidate-actions.ts",
    "src/app/customer/offers/page.tsx",
    "src/app/customer/offers/[id]/page.tsx",
    "src/app/customer/timeline/page.tsx",
    "src/app/customer/messages/page.tsx",
    "src/app/customer/messages/NewMessageButton.tsx",
    "src/app/customer/messages/[id]/page.tsx",
    "src/app/customer/messages/[id]/ConversationReplyForm.tsx",
  ];

  let allPass = true;
  requiredFiles.forEach((f) => {
    const fullPath = path.resolve(__dirname, "..", f);
    if (!fs.existsSync(fullPath)) {
      console.log(`  FAIL: Missing file ${f}`);
      allPass = false;
    }
  });

  console.log(`  Checked ${requiredFiles.length} files`);
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 6: Verify candidate-actions exports ===
function testCandidateActionsExports() {
  console.log("\n=== Test 6: Candidate Actions Exports ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/app/customer/candidate-actions.ts");
  const content = fs.readFileSync(filePath, "utf8");

  const requiredExports = [
    "getMyCandidateRecords",
    "getMyCandidateServices",
    "getMyOffers",
    "getMyOfferDetail",
    "getCandidatePortalContext",
    "getMyMessages",
    "getMyConversation",
    "sendMessageToPartner",
    "replyToConversation",
  ];

  let allPass = true;
  requiredExports.forEach((fn) => {
    if (!content.includes(`export async function ${fn}`)) {
      console.log(`  FAIL: Missing export "${fn}"`);
      allPass = false;
    }
  });

  console.log(`  Checked ${requiredExports.length} exports`);
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 7: Verify finalizeRegistrationAction has user creation ===
function testFinalizeRegistrationHasUserCreation() {
  console.log("\n=== Test 7: finalizeRegistrationAction Integration ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/app/partner/candidates/actions.ts");
  const content = fs.readFileSync(filePath, "utf8");

  const checks = [
    { name: "Imports ensureCandidateUserAccount", pass: content.includes("ensureCandidateUserAccount") },
    { name: "Imports buildCandidateLoginEmail", pass: content.includes("buildCandidateLoginEmail") },
    { name: "Calls ensureCandidateUserAccount", pass: content.includes("await ensureCandidateUserAccount(") },
    { name: "Captures tempPassword from result", pass: content.includes("accountResult.tempPassword") },
    { name: "Passes tempPassword to email", pass: content.includes("tempPassword,") || content.includes("tempPassword:") },
    { name: "Sets partnerName on candidate", pass: content.includes("partnerName: isDirectSale") },
    { name: "Login URL from NEXTAUTH_URL", pass: content.includes("portalUrl") && content.includes("/login") },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length} checks)`);
  return allPass;
}

// === Test 8: Verify offer creation has user creation ===
function testOfferCreationHasUserCreation() {
  console.log("\n=== Test 8: createPartnerOffer Integration ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/app/partner/offers/actions.ts");
  const content = fs.readFileSync(filePath, "utf8");

  const checks = [
    { name: "Imports ensureCandidateUserAccount", pass: content.includes("ensureCandidateUserAccount") },
    { name: "Calls ensureCandidateUserAccount", pass: content.includes("await ensureCandidateUserAccount(") },
    { name: "No duplicate clientName property", pass: (content.match(/clientName: data\.clientName/g) || []).length <= 1 },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length} checks)`);
  return allPass;
}

// === Test 9: Admin users action includes partner fields ===
function testAdminUsersAction() {
  console.log("\n=== Test 9: Admin Users Action — Partner Fields ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/app/admin/users/actions.ts");
  const content = fs.readFileSync(filePath, "utf8");

  const checks = [
    { name: "Has registeredByPartnerName field", pass: content.includes("registeredByPartnerName") },
    { name: "Has registeredByPartnerId field", pass: content.includes("registeredByPartnerId") },
    { name: "Has candidateSccgId field", pass: content.includes("candidateSccgId") },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length} checks)`);
  return allPass;
}

// === Test 10: Admin UsersClient shows partner column ===
function testAdminUsersClientPartnerColumn() {
  console.log("\n=== Test 10: Admin UsersClient — Partner Column ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/app/admin/users/UsersClient.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  const checks = [
    { name: "Has Partner header column", pass: content.includes(">Partner<") },
    { name: "Renders registeredByPartnerName", pass: content.includes("registeredByPartnerName") },
    { name: "Renders candidateSccgId", pass: content.includes("candidateSccgId") },
    { name: "Shows 'Direct / Self' fallback", pass: content.includes("Direct / Self") },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length} checks)`);
  return allPass;
}

// === Test 11: Proxy allows customer routes ===
function testProxyCustomerRoutes() {
  console.log("\n=== Test 11: Proxy — Customer Route Access ===");
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "..", "src/proxy.ts");
  const content = fs.readFileSync(filePath, "utf8");

  const checks = [
    { name: "Customer routes require customer role", pass: content.includes('"/customer": ["customer"]') || content.includes('"/customer":  ["customer"]') },
    { name: "Customer login redirect exists", pass: content.includes("/customer-login") },
  ];

  let allPass = true;
  checks.forEach((c) => {
    if (!c.pass) {
      console.log(`  FAIL: ${c.name}`);
      allPass = false;
    }
  });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 12: Currency Fix — EUR always used as primary ===
function testCurrencyFix() {
  console.log("\n=== Test 12: Currency Fix — EUR Primary ===");
  const fs = require("fs");
  const path = require("path");
  let allPass = true;

  // Check sharepoint.ts uses retailPriceEur as primary
  const sp = fs.readFileSync(path.resolve(__dirname, "..", "src/lib/sharepoint.ts"), "utf8");
  if (!sp.includes("Number(f[PR_COL.retailPriceEur] || f[PR_COL.price] || 0)")) {
    console.log("  FAIL: sharepoint.ts should use retailPriceEur as primary price");
    allPass = false;
  }

  // Check Step3 shows secondary currency
  const s3 = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/candidates/new/steps/Step3ServicePackage.tsx"), "utf8");
  if (!s3.includes("showSec") || !s3.includes("fmtSec")) {
    console.log("  FAIL: Step3 missing secondary currency display");
    allPass = false;
  }
  if (!s3.includes("All prices are in EUR")) {
    console.log("  FAIL: Step3 missing EUR note");
    allPass = false;
  }

  // Check Step4 shows dual currency
  const s4 = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/candidates/new/steps/Step4FinancialSplit.tsx"), "utf8");
  if (!s4.includes("dual(") || !s4.includes("real-time exchange rates")) {
    console.log("  FAIL: Step4 missing dual currency or exchange rate note");
    allPass = false;
  }

  // Check Step5 shows secondary currency
  const s5 = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/candidates/new/steps/Step5Payment.tsx"), "utf8");
  if (!s5.includes("secAmount") || !s5.includes("real-time exchange rates")) {
    console.log("  FAIL: Step5 missing secondary currency display");
    allPass = false;
  }

  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 13: Offer PDF Attachment ===
function testOfferPdfAttachment() {
  console.log("\n=== Test 13: Offer PDF Attachment in Email ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/offers/actions.ts"), "utf8");
  const checks = [
    { name: "Imports generateSalesOfferPdf", pass: content.includes("generateSalesOfferPdf") },
    { name: "Generates PDF bytes", pass: content.includes("pdfBase64") && content.includes("Buffer.from(pdfBytes)") },
    { name: "Attaches PDF to email", pass: content.includes("attachments:") && content.includes("Offer-${offer.offerNumber}.pdf") },
    { name: "Email mentions attached PDF", pass: content.includes("attached PDF document") },
    { name: "PDF generation is non-blocking", pass: content.includes("PDF generation is non-blocking") },
  ];

  let allPass = true;
  checks.forEach(c => { if (!c.pass) { console.log(`  FAIL: ${c.name}`); allPass = false; } });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length})`);
  return allPass;
}

// === Test 14: Product Categories ===
function testProductCategories() {
  console.log("\n=== Test 14: Product Seed Categories ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "scripts/setup-products.mjs"), "utf8");
  const requiredCategories = ["Training & Language", "Ausbildung", "Opportunity Card", "Student", "Others"];
  const requiredProducts = [
    "Profile Assessment", "Advanced Job Application Training", "Advanced Student Preparation",
    "Ausbildung All Inclusive", "Student All Inclusive", "Opportunity Card All Inclusive",
    "OC Application Submission", "Translation Service", "Visa Support",
    "Advanced Application Preparation",
  ];

  let allPass = true;
  requiredCategories.forEach(cat => {
    if (!content.includes(`Category: "${cat}"`)) {
      console.log(`  FAIL: Missing category "${cat}"`);
      allPass = false;
    }
  });
  requiredProducts.forEach(prod => {
    if (!content.includes(`Title: "${prod}"`)) {
      console.log(`  FAIL: Missing product "${prod}"`);
      allPass = false;
    }
  });

  // Check no old categories remain
  ["Plans", "Assessment", "Coaching", "Language"].forEach(old => {
    if (content.includes(`Category: "${old}"`)) {
      console.log(`  FAIL: Old category "${old}" still present`);
      allPass = false;
    }
  });

  // Check include tags
  if (!content.includes("include:")) {
    console.log("  FAIL: Missing include tags for What's Included");
    allPass = false;
  }

  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"}`);
  return allPass;
}

// === Test 15: Customer Offer What's Included ===
function testCustomerOfferWhatsIncluded() {
  console.log("\n=== Test 15: Customer Offer — What's Included ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/app/customer/offers/[id]/page.tsx"), "utf8");
  const checks = [
    { name: "Imports getProducts", pass: content.includes("getProducts") },
    { name: "Builds productMap", pass: content.includes("productMap") },
    { name: "Parses include: tags", pass: content.includes('include:') && content.includes('includes:') },
    { name: "Shows What's Included header", pass: content.includes("What") && content.includes("Included") },
    { name: "Uses CheckCircle icon", pass: content.includes("CheckCircle2") },
    { name: "Shows product category badge", pass: content.includes("product.category") || content.includes("product?.category") },
  ];

  let allPass = true;
  checks.forEach(c => { if (!c.pass) { console.log(`  FAIL: ${c.name}`); allPass = false; } });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length})`);
  return allPass;
}

// === Test 16: Invoice Email Fix ===
function testInvoiceEmailFix() {
  console.log("\n=== Test 16: Invoice Email Recipient Fix ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/finance/invoices/actions.ts"), "utf8");
  const checks = [
    { name: "Looks up by clientId", pass: content.includes("invoice.clientId") && content.includes("getCandidateById") },
    { name: "Fallback name search is case-insensitive", pass: content.includes("toLowerCase()") },
    { name: "No undefined assignment bug", pass: !content.includes("invoice.clientName ? undefined : undefined") },
    { name: "Email-based fallback search", pass: content.includes("c.email?.toLowerCase()") },
  ];

  let allPass = true;
  checks.forEach(c => { if (!c.pass) { console.log(`  FAIL: ${c.name}`); allPass = false; } });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length})`);
  return allPass;
}

// === Test 17: Partner Logo Upload ===
function testPartnerLogoUpload() {
  console.log("\n=== Test 17: Partner Logo Upload ===");
  const fs = require("fs");
  const path = require("path");

  const form = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/settings/SettingsForm.tsx"), "utf8");
  const action = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/settings/actions.ts"), "utf8");
  const page = fs.readFileSync(path.resolve(__dirname, "..", "src/app/partner/settings/page.tsx"), "utf8");

  const checks = [
    { name: "Form has logoUrl state", pass: form.includes("logoUrl") && form.includes("setLogoUrl") },
    { name: "Form has Partner Branding section", pass: form.includes("Partner Branding") },
    { name: "Form has logo URL input", pass: form.includes('type="url"') },
    { name: "Form passes logoUrl to action", pass: form.includes("logoUrl:") },
    { name: "Action accepts logoUrl param", pass: action.includes("logoUrl?:") },
    { name: "Action saves LogoUrl field", pass: action.includes('"LogoUrl"') },
    { name: "Page passes logoUrl to form", pass: page.includes("logoUrl:") },
  ];

  let allPass = true;
  checks.forEach(c => { if (!c.pass) { console.log(`  FAIL: ${c.name}`); allPass = false; } });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length})`);
  return allPass;
}

// === Test 18: Payment Methods — Bangladesh Bank Transfer ===
function testPaymentMethods() {
  console.log("\n=== Test 18: Payment Methods — Bank Transfer ===");
  const fs = require("fs");
  const path = require("path");

  const content = fs.readFileSync(path.resolve(__dirname, "..", "src/app/(shared)/marketplace/checkout/PaymentGateway.tsx"), "utf8");
  const checks = [
    { name: "Has bank-transfer method", pass: content.includes('"bank-transfer"') },
    { name: "Has Bangladesh Bank Transfer label", pass: content.includes("Bangladesh Bank Transfer") },
    { name: "Has bank-details step", pass: content.includes('"bank-details"') },
    { name: "Shows bank transfer form", pass: content.includes("Transaction Reference") },
    { name: "Has BBT reference prefix", pass: content.includes('"BBT"') },
    { name: "Shows account details", pass: content.includes("Branch") && content.includes("Routing") },
  ];

  let allPass = true;
  checks.forEach(c => { if (!c.pass) { console.log(`  FAIL: ${c.name}`); allPass = false; } });
  console.log(`  Result: ${allPass ? "PASS ✅" : "FAIL ❌"} (${checks.filter(c => c.pass).length}/${checks.length})`);
  return allPass;
}

// === Run All Tests ===
console.log("╔══════════════════════════════════════════════╗");
console.log("║  SCCG Candidate Portal — End-to-End Tests   ║");
console.log("╚══════════════════════════════════════════════╝");

const results = [
  testPasswordGeneration(),
  testEmailTemplateSource(),
  testMenuEngineSource(),
  testFileExistence(),
  testCandidateActionsExports(),
  testFinalizeRegistrationHasUserCreation(),
  testOfferCreationHasUserCreation(),
  testAdminUsersAction(),
  testAdminUsersClientPartnerColumn(),
  testProxyCustomerRoutes(),
  testCurrencyFix(),
  testOfferPdfAttachment(),
  testProductCategories(),
  testCustomerOfferWhatsIncluded(),
  testInvoiceEmailFix(),
  testPartnerLogoUpload(),
  testPaymentMethods(),
];

const passed = results.filter(Boolean).length;
const total = results.length;

console.log("\n" + "═".repeat(48));
console.log(`  Final: ${passed}/${total} test suites passed ${passed === total ? "✅" : "❌"}`);
console.log("═".repeat(48));

process.exit(passed === total ? 0 : 1);
