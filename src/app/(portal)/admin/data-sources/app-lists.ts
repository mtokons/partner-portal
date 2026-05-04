/**
 * Canonical registry of every SharePoint list THIS web app reads or writes.
 *
 * Used to:
 *  - Filter the admin "Data Sources" viewer to only show app-relevant lists
 *    (the SP site has many other unrelated lists that we want to hide).
 *  - Render the always-on "Feature Mapping" tab so admins can see exactly
 *    which feature talks to which list / collection.
 *
 * Keep this in sync with:
 *  - scripts/setup-all-lists.mjs
 *  - src/lib/sharepoint.ts
 *  - DATA_SOURCE_MAP.md
 */

export interface AppListEntry {
  /** SharePoint list displayName (must match exactly) */
  name: string;
  /** Domain grouping for the UI */
  group:
    | "CRM"
    | "Commerce"
    | "Financials"
    | "Sales"
    | "Referrals"
    | "Promotions"
    | "Wallet"
    | "Identity"
    | "Notifications"
    | "AI"
    | "Sessions"
    | "School"
    | "Tasks";
  /** Short human-readable description */
  description: string;
  /** Features / pages that read or write this list */
  usedBy: string[];
}

export const APP_SP_LISTS: AppListEntry[] = [
  // ---------- CRM ----------
  { name: "Partners",          group: "CRM",        description: "Partner profiles & onboarding",            usedBy: ["Admin > Partners", "Login", "Profile"] },
  { name: "Clients",           group: "CRM",        description: "Partner clients (B2B contacts)",            usedBy: ["Clients", "Orders", "Sales Offers"] },
  { name: "Activities",        group: "CRM",        description: "Activity stream / audit feed",              usedBy: ["Dashboard", "Activity feed"] },

  // ---------- Commerce ----------
  { name: "Products",          group: "Commerce",   description: "Catalog products / packages / cards",       usedBy: ["Shop", "Marketplace", "Sales Offers"] },
  { name: "Orders",            group: "Commerce",   description: "Legacy partner orders",                     usedBy: ["Orders", "Dashboard"] },

  // ---------- Financials ----------
  { name: "Financials",        group: "Financials", description: "Monthly partner revenue rollups",           usedBy: ["Financials", "Dashboard"] },
  { name: "Invoices",          group: "Financials", description: "Issued invoices (proforma/tax/receipt)",   usedBy: ["Financials", "Customer > Invoices"] },
  { name: "Installments",      group: "Financials", description: "Installment plans for orders",              usedBy: ["Financials", "Customer > Payments"] },
  { name: "Transactions",      group: "Financials", description: "Money in/out ledger",                       usedBy: ["Financials"] },
  { name: "Expenses",          group: "Financials", description: "Partner-logged expenses",                   usedBy: ["Financials"] },

  // ---------- Sales workflow ----------
  { name: "SalesOffers",       group: "Sales",      description: "Quotations / offers to clients",            usedBy: ["Sales > Offers", "Offer Response"] },
  { name: "SalesOfferItems",   group: "Sales",      description: "Line items per sales offer",                usedBy: ["Sales > Offers"] },
  { name: "SalesOrders",       group: "Sales",      description: "Confirmed sales orders",                    usedBy: ["Sales > Orders"] },
  { name: "SalesOrderItems",   group: "Sales",      description: "Line items per sales order",                usedBy: ["Sales > Orders"] },
  { name: "ServiceTasks",      group: "Sales",      description: "Fulfilment tasks per order",                usedBy: ["Admin > Tasks", "Sales > Orders"] },
  { name: "EmailTracking",     group: "Sales",      description: "Outbound offer email tracking",             usedBy: ["Sales > Offers"] },
  { name: "OfferAcceptanceLog",group: "Sales",      description: "Public offer accept/reject audit",          usedBy: ["Offer Response"] },

  // ---------- Promotions ----------
  { name: "Promotions",        group: "Promotions", description: "Storefront promotions & banners",           usedBy: ["Shop", "Marketplace"] },
  { name: "PromoCodes",        group: "Promotions", description: "Promo & referral codes",                    usedBy: ["Shop checkout", "Referrals"] },
  { name: "PromoCodeUsages",   group: "Promotions", description: "Per-redemption history of promo codes",     usedBy: ["Referrals", "Admin > Audit"] },

  // ---------- Referrals & payouts ----------
  { name: "Referrals",         group: "Referrals",  description: "Referral relationships & earnings",         usedBy: ["Referrals", "Commissions"] },
  { name: "Payouts",           group: "Referrals",  description: "Partner / expert / referrer payouts",       usedBy: ["Commissions", "Wallets"] },
  { name: "CommissionRules",   group: "Referrals",  description: "Configurable commission rules",             usedBy: ["Admin > Commissions"] },
  { name: "CommissionLedger",  group: "Referrals",  description: "Append-only commission ledger",             usedBy: ["Commissions"] },

  // ---------- Wallet & SCCG cards ----------
  { name: "CoinWallets",       group: "Wallet",     description: "User SCCG coin balances",                   usedBy: ["Wallets"] },
  { name: "CoinTransactions",  group: "Wallet",     description: "Coin earn/spend ledger",                    usedBy: ["Wallets"] },
  { name: "GiftCards",         group: "Wallet",     description: "SCCG cards / gift cards",                   usedBy: ["Wallets", "Shop"] },
  { name: "GiftCardTransactions",group: "Wallet",   description: "Gift card redemption history",              usedBy: ["Wallets"] },

  // ---------- Identity ----------
  { name: "UserProfiles",      group: "Identity",   description: "Unified user profile",                      usedBy: ["Profile", "Login"] },
  { name: "UserRoles",         group: "Identity",   description: "Role grants per user",                      usedBy: ["Auth", "Admin > Users"] },

  // ---------- Notifications ----------
  { name: "AppNotifications",  group: "Notifications", description: "In-app notifications",                   usedBy: ["Header bell", "Customer/Expert > Notifications"] },

  // ---------- AI ----------
  { name: "CareerProfiles",    group: "AI",         description: "AI career engine generated profiles",       usedBy: ["School", "Career suggestions"] },

  // ---------- Sessions / Customer / Expert ----------
  { name: "Customers",         group: "Sessions",   description: "End customers (B2C)",                       usedBy: ["Admin > Customers", "Customer login"] },
  { name: "Experts",           group: "Sessions",   description: "Expert profiles",                           usedBy: ["Expert portal", "Sessions"] },
  { name: "ServicePackages",   group: "Sessions",   description: "Bookable service package definitions",      usedBy: ["Customer > Packages"] },
  { name: "CustomerPackages",  group: "Sessions",   description: "Purchased package instances per customer", usedBy: ["Customer > Packages", "Sessions"] },
  { name: "Sessions",          group: "Sessions",   description: "Individual coaching/teaching sessions",     usedBy: ["Customer > Sessions", "Expert > Sessions"] },
  { name: "ExpertPayments",    group: "Sessions",   description: "Per-session payouts owed to experts",       usedBy: ["Expert > Payments", "Admin > Payouts"] },

  // ---------- School ----------
  { name: "SchoolCertificates",group: "School",     description: "Issued course certificates",                usedBy: ["Customer > School", "Admin > Certificates"] },

  // ---------- Tasks ----------
  { name: "KanbanTasks",       group: "Tasks",      description: "Internal Kanban tasks",                     usedBy: ["Admin > Tasks"] },
];

export const APP_SP_LIST_NAMES = new Set(APP_SP_LISTS.map((l) => l.name));

export interface FirestoreCollectionEntry {
  name: string;
  description: string;
  usedBy: string[];
}

export const APP_FIRESTORE_COLLECTIONS: FirestoreCollectionEntry[] = [
  { name: "users",            description: "NextAuth user accounts (login, roles, sccgId)", usedBy: ["Auth", "Admin > Users"] },
  { name: "sccgSequences",    description: "Atomic counters for SCCG ID generation",         usedBy: ["Registration"] },
  { name: "auditLogs",        description: "Privileged action audit trail",                  usedBy: ["Admin > Audit"] },
  { name: "employees",        description: "Internal SCCG employees",                        usedBy: ["Admin > Employees"] },
  { name: "payments",         description: "Online payment intents / receipts",              usedBy: ["Customer > Payments"] },
  { name: "enhancedInvoices", description: "PDF-generated enhanced invoices",                usedBy: ["Customer > Invoices"] },
  { name: "sccgCards",        description: "SCCG card metadata (mirrors GiftCards SP list)", usedBy: ["Wallets"] },
  { name: "notifications-bus",description: "SSE pub/sub channel for live notifications",     usedBy: ["Header bell", "Notifications"] },
];
