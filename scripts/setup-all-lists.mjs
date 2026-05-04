/**
 * Unified, idempotent SharePoint provisioning script.
 *
 * Creates every SharePoint list that src/lib/sharepoint.ts reads/writes from.
 * Safe to re-run: existing lists are skipped; missing columns are added if the
 * list exists but is missing fields.
 *
 * Run:  node scripts/setup-all-lists.mjs
 * Optional: node scripts/setup-all-lists.mjs --only=AppNotifications,CareerProfiles
 *
 * Env (loaded from .env.local):
 *   AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_SECRET, SHAREPOINT_SITE_URL
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// ---------- env loader ----------
try {
  const env = readFileSync(".env.local", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

const REQUIRED = ["AZURE_AD_CLIENT_ID", "AZURE_AD_TENANT_ID", "AZURE_AD_CLIENT_SECRET", "SHAREPOINT_SITE_URL"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

// ---------- args ----------
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyList = onlyArg ? onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean) : null;

// ---------- graph client ----------
const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

let cachedToken = null;
let tokenExpiresAt = 0;
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;
  const r = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  cachedToken = r.accessToken;
  tokenExpiresAt = (r.expiresOn?.getTime?.() ?? Date.now() + 3300_000);
  return cachedToken;
}

async function graph(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 404 && method === "GET") return null;
    const text = await res.text();
    throw new Error(`Graph ${method} ${url} -> ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function resolveSiteId() {
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  const sitePath = pathname.replace(/\/+$/, "") || "/";
  const site = await graph("GET", `/sites/${hostname}:${sitePath}`);
  if (!site?.id) throw new Error("Could not resolve site id");
  return site.id;
}

// ---------- column helpers ----------
const t = (extra = {}) => ({ text: extra });
const tMulti = () => ({ text: { allowMultipleLines: true } });
const num = () => ({ number: {} });
const cur = (locale = "de-DE") => ({ currency: { locale } });
const bool = () => ({ boolean: {} });
const dt = () => ({ dateTime: {} });
const ch = (choices) => ({ choice: { choices } });

const col = (name, def) => ({ name, ...def });

// ---------- list catalog ----------
// Each entry: { name, columns: [{name, ...graphColumnDef}] }
// Primary "Title" column always exists by default — only override if intentionally repurposing it.
const LISTS = [
  // ===== Core CRM / Commerce =====
  {
    name: "Partners",
    columns: [
      col("Email", t()),
      col("PasswordHash", t()),
      col("Role", ch(["partner", "admin", "customer", "expert", "student"])),
      col("Status", ch(["pending", "active", "suspended"])),
      col("Company", t()),
      col("Phone", t()),
      col("PartnerType", ch(["individual", "institutional"])),
      col("PartnerCode", t()),
      col("CommissionTier", ch(["standard", "premium", "enterprise"])),
      col("TaxId", t()),
      col("LegalEntityName", t()),
      col("OnboardingStatus", ch(["application", "review", "approved", "rejected"])),
      col("ApprovedBy", t()),
      col("ApprovedAt", dt()),
      col("FirebaseUid", t()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Clients",
    columns: [
      col("PartnerId", t()),
      col("Name", t()),
      col("Email", t()),
      col("Phone", t()),
      col("Company", t()),
      col("Address", tMulti()),
      col("IsOnHold", bool()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Orders",
    columns: [
      col("PartnerId", t()),
      col("ClientId", t()),
      col("ClientName", t()),
      col("Items", tMulti()), // JSON-encoded order items
      col("Status", ch(["pending", "confirmed", "shipped", "delivered", "cancelled"])),
      col("TotalAmount", cur()),
      col("TotalAmountEUR", cur("de-DE")),
      col("ConversionRate", num()),
      col("Notes", tMulti()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Activities",
    columns: [
      col("PartnerId", t()),
      col("Type", ch(["order", "client", "payment", "installment", "login", "expense", "invoice"])),
      col("Description", tMulti()),
      col("RelatedId", t()),
      col("CreatedAt", dt()),
    ],
  },
  // ===== Financials =====
  {
    name: "Financials",
    columns: [
      col("PartnerId", t()),
      col("Period", t()),
      col("Revenue", cur()),
      col("Outstanding", cur()),
      col("Paid", cur()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Installments",
    columns: [
      col("OrderId", t()),
      col("ClientId", t()),
      col("ClientName", t()),
      col("PartnerId", t()),
      col("InstallmentNumber", num()),
      col("TotalInstallments", num()),
      col("Amount", cur()),
      col("AmountEUR", cur("de-DE")),
      col("ConversionRate", num()),
      col("DueDate", dt()),
      col("PaidDate", dt()),
      col("Status", ch(["upcoming", "paid", "overdue"])),
      col("Notes", tMulti()),
    ],
  },
  {
    name: "Transactions",
    columns: [
      col("ClientId", t()),
      col("PartnerId", t()),
      col("Type", ch(["purchase", "payment", "refund"])),
      col("Amount", cur()),
      col("AmountEUR", cur("de-DE")),
      col("ConversionRate", num()),
      col("Reference", t()),
      col("OrderId", t()),
      col("Description", tMulti()),
      col("Date", dt()),
    ],
  },
  {
    name: "Expenses",
    columns: [
      col("PartnerId", t()),
      col("Category", t()),
      col("Amount", cur()),
      col("AmountEUR", cur("de-DE")),
      col("ConversionRate", num()),
      col("Description", tMulti()),
      col("Date", dt()),
    ],
  },
  {
    name: "Invoices",
    columns: [
      col("InvoiceNumber", t()),
      col("InvoiceType", ch(["proforma", "tax", "receipt"])),
      col("PartnerId", t()),
      col("ClientId", t()),
      col("ClientName", t()),
      col("OrderId", t()),
      col("Amount", cur()),
      col("AmountEUR", cur("de-DE")),
      col("ConversionRate", num()),
      col("Status", ch(["draft", "sent", "paid", "overdue"])),
      col("DueDate", dt()),
      col("PdfUrl", t()),
      col("CreatedAt", dt()),
    ],
  },
  // ===== Sales workflow extras =====
  {
    name: "ServiceTasks",
    columns: [
      col("SalesOrderId", t()),
      col("OrderNumber", t()),
      col("Description", tMulti()),
      col("AssignedTo", t()),
      col("Status", ch(["planned", "in-progress", "completed", "cancelled"])),
      col("DueDate", dt()),
      col("CompletedAt", dt()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Promotions",
    columns: [
      col("Description", tMulti()),
      col("Type", ch(["discount", "bundle", "promo", "announcement"])),
      col("AppliesTo", ch(["all", "product", "category"])),
      col("ProductId", t()),
      col("Category", t()),
      col("DiscountType", ch(["fixed", "percent"])),
      col("DiscountValue", num()),
      col("StartDate", dt()),
      col("EndDate", dt()),
      col("IsActive", bool()),
      col("ImageUrl", t()),
      col("Priority", num()),
    ],
  },
  // ===== Referrals / Payouts / Commission =====
  {
    name: "Referrals",
    columns: [
      col("ReferrerId", t()),
      col("ReferrerName", t()),
      col("ReferrerType", ch(["partner", "expert", "user"])),
      col("SalesOfferId", t()),
      col("SalesOrderId", t()),
      col("Percentage", num()),
      col("Amount", cur()),
      col("Status", ch(["pending", "approved", "paid"])),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Payouts",
    columns: [
      col("RecipientId", t()),
      col("RecipientName", t()),
      col("RecipientType", ch(["partner", "expert", "referrer"])),
      col("RelatedOrderId", t()),
      col("RelatedOrderNumber", t()),
      col("Gross", cur()),
      col("Deductions", cur()),
      col("Net", cur()),
      col("Currency", ch(["BDT", "EUR"])),
      col("Status", ch(["pending", "eligible", "approved", "paid"])),
      col("PayoutDate", dt()),
      col("Notes", tMulti()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "CommissionRules",
    columns: [
      col("CodeType", ch(["promo-general", "referral-personal", "referral-partner-individual", "referral-partner-institutional"])),
      col("PartnerTier", ch(["standard", "premium", "enterprise", "any"])),
      col("ProductCategory", t()),
      col("CommissionPercent", num()),
      col("MinOrderAmount", cur()),
      col("MaxCommission", cur()),
      col("IsActive", bool()),
      col("Priority", num()),
      col("EffectiveFrom", dt()),
      col("EffectiveUntil", dt()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "CommissionLedger",
    columns: [
      col("EntryType", ch([
        "commission-posted", "commission-adjustment", "commission-reversed",
        "commission-settled", "payout-requested", "payout-approved", "payout-completed",
      ])),
      col("RecipientId", t()),
      col("RecipientName", t()),
      col("RecipientType", t()),
      col("SalesOrderId", t()),
      col("OrderNumber", t()),
      col("PromoCodeId", t()),
      col("RuleId", t()),
      col("Amount", cur()),
      col("Currency", ch(["BDT", "EUR"])),
      col("RunningBalance", cur()),
      col("Description", tMulti()),
      col("RelatedEntryId", t()),
      col("CreatedAt", dt()),
      col("CreatedBy", t()),
    ],
  },
  // ===== Promo Codes =====
  {
    name: "PromoCodes",
    columns: [
      col("Code", t()),
      col("CodeType", ch(["promo-general", "referral-personal", "referral-partner-individual", "referral-partner-institutional"])),
      col("OwnerId", t()),
      col("OwnerName", t()),
      col("PartnerProfileId", t()),
      col("DiscountType", ch(["fixed", "percent", "none"])),
      col("DiscountValue", num()),
      col("CommissionRuleId", t()),
      col("MaxUses", num()),
      col("CurrentUses", num()),
      col("MaxUsesPerUser", num()),
      col("MinOrderAmount", cur()),
      col("ApplicableProducts", tMulti()),
      col("ApplicableCategories", tMulti()),
      col("ValidFrom", dt()),
      col("ValidUntil", dt()),
      col("Status", ch(["active", "paused", "expired", "revoked"])),
      col("ShareableLink", t()),
      col("QrCodeData", tMulti()),
      col("CreatedAt", dt()),
      col("CreatedBy", t()),
    ],
  },
  {
    name: "PromoCodeUsages",
    columns: [
      col("PromoCodeId", t()),
      col("Code", t()),
      col("UsedByUserId", t()),
      col("UsedByEmail", t()),
      col("SalesOfferId", t()),
      col("SalesOrderId", t()),
      col("DiscountApplied", cur()),
      col("CommissionGenerated", cur()),
      col("UsedAt", dt()),
    ],
  },
  // ===== Wallet & SCCG Cards =====
  {
    name: "CoinWallets",
    columns: [
      col("UserId", t()),
      col("UserName", t()),
      col("Balance", num()),
      col("TotalEarned", num()),
      col("TotalSpent", num()),
      col("Status", ch(["active", "frozen", "closed"])),
      col("CreatedAt", dt()),
      col("UpdatedAt", dt()),
    ],
  },
  {
    name: "CoinTransactions",
    columns: [
      col("WalletId", t()),
      col("UserId", t()),
      col("TransactionType", ch([
        "top-up", "earn-commission", "earn-referral", "earn-refund",
        "spend-purchase", "spend-gift", "adjustment-admin", "expiry",
      ])),
      col("Amount", num()),
      col("RunningBalance", num()),
      col("ReferenceType", t()),
      col("ReferenceId", t()),
      col("Description", tMulti()),
      col("ExpiresAt", dt()),
      col("CreatedAt", dt()),
      col("CreatedBy", t()),
    ],
  },
  {
    name: "GiftCards",
    columns: [
      col("SccgId", t()),
      col("CardNumber", t()),
      col("PinHash", t()),
      col("PinAttempts", num()),
      col("Status", ch(["active", "frozen", "expired", "depleted", "cancelled"])),
      col("Balance", cur()),
      col("Design", ch(["standard", "premium", "birthday", "corporate"])),
      col("ClientId", t()),
      col("ClientName", t()),
      col("ClientEmail", t()),
      col("IssuedToUserId", t()),
      col("IssuedToName", t()),
      col("IssuedToEmail", t()),
      col("IssuedByUserId", t()),
      col("IssuedAt", dt()),
      col("ExpiresAt", dt()),
      col("LastUsedAt", dt()),
    ],
  },
  {
    name: "GiftCardTransactions",
    columns: [
      col("GiftCardId", t()),
      col("TransactionType", ch(["issue", "redeem", "topup", "refund", "adjust", "expire"])),
      col("Type", t()),
      col("Amount", cur()),
      col("RunningBalance", cur()),
      col("BalanceAfter", cur()),
      col("Description", tMulti()),
      col("CreatedAt", dt()),
      col("CreatedBy", t()),
    ],
  },
  // ===== Identity =====
  {
    name: "UserProfiles",
    columns: [
      col("Email", t()),
      col("Phone", t()),
      col("Role", ch(["partner", "customer", "expert", "admin"])),
      col("Company", t()),
      col("Specialization", t()),
      col("Status", ch(["active", "pending", "suspended"])),
      col("FirebaseUid", t()),
      col("CreatedAt", dt()),
      col("UpdatedAt", dt()),
    ],
  },
  {
    name: "UserRoles",
    columns: [
      col("UserAccountId", t()),
      col("Role", ch([
        "admin", "customer", "partner", "partner-individual", "partner-institutional",
        "expert", "finance", "hr", "teacher", "school-manager", "student",
      ])),
      col("Status", ch(["active", "pending", "suspended", "revoked"])),
      col("GrantedAt", dt()),
      col("GrantedBy", t()),
      col("RevokedAt", dt()),
      col("Notes", tMulti()),
    ],
  },
  // ===== Notifications & Email =====
  {
    name: "AppNotifications",
    columns: [
      col("UserId", t()),
      col("UserType", ch(["customer", "expert", "partner", "admin"])),
      col("Type", ch([
        "payment_due", "payment_received", "session_scheduled", "session_completed",
        "session_reminder", "expert_assigned", "payment_eligible", "payment_approved",
        "offer_accepted", "offer_rejected", "order_created", "invoice_issued",
        "certificate_issued", "general",
      ])),
      col("Message", tMulti()),
      col("Read", bool()),
      col("RelatedId", t()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "EmailTracking",
    columns: [
      col("SalesOfferId", t()),
      col("OfferNumber", t()),
      col("RecipientEmail", t()),
      col("RecipientName", t()),
      col("SenderName", t()),
      col("Subject", t()),
      col("Status", ch(["queued", "sent", "delivered", "opened", "failed"])),
      col("SentAt", dt()),
      col("OpenedAt", dt()),
      col("AcceptToken", t()),
      col("ExpiresAt", dt()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "OfferAcceptanceLog",
    columns: [
      col("SalesOfferId", t()),
      col("OfferNumber", t()),
      col("AcceptToken", t()),
      col("ClientEmail", t()),
      col("Action", ch(["accepted", "rejected", "viewed"])),
      col("IpAddress", t()),
      col("UserAgent", tMulti()),
      col("Timestamp", dt()),
    ],
  },
  // ===== AI Career Engine =====
  {
    name: "CareerProfiles",
    columns: [
      col("UserId", t()),
      col("UserName", t()),
      col("Email", t()),
      col("CurrentRole", t()),
      col("YearsExperience", num()),
      col("Education", tMulti()),
      col("Skills", tMulti()),
      col("Goals", tMulti()),
      col("Industry", t()),
      col("Profile", tMulti()),
      col("Suggestions", tMulti()), // JSON array of suggested products/courses
      col("LastModelVersion", t()),
      col("GeneratedAt", dt()),
      col("UpdatedAt", dt()),
    ],
  },
  // ===== Customer / Expert / Sessions (mock-data parity) =====
  {
    name: "Customers",
    columns: [
      col("Email", t()),
      col("PasswordHash", t()),
      col("Phone", t()),
      col("Company", t()),
      col("PartnerId", t()),
      col("Status", ch(["active", "pending", "suspended"])),
      col("FirebaseUid", t()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "ServicePackages",
    columns: [
      col("Description", tMulti()),
      col("TotalSessions", num()),
      col("SessionDurationMinutes", num()),
      col("ValidityDays", num()),
      col("Price", cur()),
      col("Category", t()),
    ],
  },
  {
    name: "CustomerPackages",
    columns: [
      col("CustomerId", t()),
      col("CustomerName", t()),
      col("PartnerId", t()),
      col("ServicePackageId", t()),
      col("PackageName", t()),
      col("TotalSessions", num()),
      col("CompletedSessions", num()),
      col("TotalAmount", cur()),
      col("AmountPaid", cur()),
      col("StartDate", dt()),
      col("EndDate", dt()),
      col("Status", ch(["active", "completed", "cancelled", "expired"])),
      col("ExpertId", t()),
      col("ExpertName", t()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "Sessions",
    columns: [
      col("CustomerPackageId", t()),
      col("CustomerId", t()),
      col("CustomerName", t()),
      col("ExpertId", t()),
      col("ExpertName", t()),
      col("PartnerId", t()),
      col("SessionNumber", num()),
      col("TotalSessions", num()),
      col("ScheduledAt", dt()),
      col("CompletedAt", dt()),
      col("DurationMinutes", num()),
      col("Status", ch(["pending", "scheduled", "completed", "cancelled"])),
      col("Notes", tMulti()),
      col("ExpertNotes", tMulti()),
      col("CustomerRating", num()),
      col("CreatedAt", dt()),
    ],
  },
  {
    name: "ExpertPayments",
    columns: [
      col("ExpertId", t()),
      col("ExpertName", t()),
      col("SessionId", t()),
      col("CustomerId", t()),
      col("CustomerName", t()),
      col("PartnerId", t()),
      col("Amount", cur()),
      col("Status", ch(["pending", "eligible", "approved", "paid"])),
      col("EligibleAt", dt()),
      col("ApprovedAt", dt()),
      col("PaidAt", dt()),
      col("ApprovedBy", t()),
      col("CreatedAt", dt()),
    ],
  },
];

// ---------- core ops ----------
async function listAllExisting(siteId) {
  const out = new Map();
  let url = `/sites/${siteId}/lists?$top=200`;
  // Graph paginates with @odata.nextLink
  for (;;) {
    const res = await graph("GET", url);
    for (const l of res.value || []) out.set(l.displayName, l);
    const next = res["@odata.nextLink"];
    if (!next) break;
    url = next.replace("https://graph.microsoft.com/v1.0", "");
  }
  return out;
}

async function getListColumns(siteId, listId) {
  const res = await graph("GET", `/sites/${siteId}/lists/${listId}/columns`);
  return new Set((res.value || []).map((c) => c.name));
}

async function ensureList(siteId, existingMap, def) {
  const existing = existingMap.get(def.name);
  if (existing) {
    console.log(`  • ${def.name} — exists, checking columns…`);
    const have = await getListColumns(siteId, existing.id);
    let added = 0;
    for (const c of def.columns) {
      if (have.has(c.name)) continue;
      try {
        await graph("POST", `/sites/${siteId}/lists/${existing.id}/columns`, c);
        added++;
        console.log(`      + added column ${c.name}`);
      } catch (e) {
        // SharePoint sometimes reserves names; surface but don't abort
        console.warn(`      ! could not add ${c.name}: ${e.message.split("\n")[0]}`);
      }
    }
    if (added === 0) console.log(`      ✓ schema up to date`);
    return existing.id;
  }
  console.log(`  + creating list ${def.name}…`);
  const created = await graph("POST", `/sites/${siteId}/lists`, {
    displayName: def.name,
    columns: def.columns,
    list: { template: "genericList" },
  });
  console.log(`      created (id=${created.id})`);
  return created.id;
}

async function main() {
  console.log("Resolving SharePoint site…");
  const siteId = await resolveSiteId();
  console.log(`Site id: ${siteId}`);

  console.log("Loading existing lists…");
  const existing = await listAllExisting(siteId);
  console.log(`Found ${existing.size} existing lists.`);

  const targets = onlyList ? LISTS.filter((l) => onlyList.includes(l.name)) : LISTS;
  if (onlyList) console.log(`Filtering to: ${onlyList.join(", ")}`);
  console.log(`Provisioning ${targets.length} list(s)…\n`);

  const errors = [];
  for (const def of targets) {
    try {
      await ensureList(siteId, existing, def);
    } catch (e) {
      console.error(`✗ ${def.name}: ${e.message}`);
      errors.push(def.name);
    }
  }

  console.log(`\nDone. ${targets.length - errors.length}/${targets.length} ok.`);
  if (errors.length) {
    console.error(`Failed: ${errors.join(", ")}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
