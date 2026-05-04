import type {
  Partner, Product, Order, Client, Activity, Financial,
  Installment, Transaction, Expense, Invoice,
  Customer, Expert, ServicePackage, CustomerPackage,
  Session, ExpertPayment, AppNotification,
  SalesOffer, SalesOfferItem, SalesOrder, SalesOrderItem, ServiceTask,
  Promotion, Referral, Payout,
  EmailTracking, OfferAcceptanceLog,
  PromoCode, PromoCodeUsage, CommissionRule, CommissionLedgerEntry,
  CoinWallet, CoinTransaction, GiftCard, GiftCardTransaction, UserRoleEntry,
  SccgCard, SccgCardTransaction,
  KanbanTask,
  SchoolCertificate,
} from "@/types";

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
void isProduction;

/**
 * Executes a SharePoint fetch operation.
 * Returns an empty result instead of crashing if SharePoint is unconfigured or failing.
 */
async function runSafe<T>(liveFn: () => Promise<T>, fallback?: () => T): Promise<T> {
  try {
    return await liveFn();
  } catch (err: any) {
    const stack = (new Error().stack || "").split("\n").slice(2, 6).join("\n");
    const msg = err?.message || String(err);
    const code = err?.code || err?.statusCode;

    // Missing list / 404 → warn-once style log; not actionable, just empty.
    if (code === 404 || code === "itemNotFound" || /does not exist/i.test(msg)) {
      // eslint-disable-next-line no-console
      console.warn(`[SharePoint] list missing (returning empty): ${msg.split("\n")[0]}`);
    } else if (/field name is not recognized|cannot be referenced in filter or orderby/i.test(msg)) {
      // List exists but our code references a column that's missing on this tenant.
      // Non-fatal: feature degrades to empty until the list schema is updated.
      // eslint-disable-next-line no-console
      console.warn(`[SharePoint] schema mismatch (returning empty): ${msg.split("\n")[0]}`);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[SharePoint] failed: ${msg}\n  caller:\n${stack}`);
    }
    if (fallback) return fallback();
    return ([] as unknown as T);
  }
}

/**
 * Returns diagnostic information about the SharePoint connection.
 */
export async function getSharePointConnectionInfo() {
  const siteUrl = process.env.SHAREPOINT_SITE_URL || null;
  let base = siteUrl?.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  
  if (base && base.includes("/Lists/")) {
    base = base.split("/Lists/")[0];
  }
  
  // Build URLs for all known SharePoint lists
  const listUrls: Record<string, string> = {};
  if (base) {
    const lists = [
      "SalesOrders", "SalesOffers", "SalesOfferItems",
      "Clients", "Products", "Orders",
      "Financials", "Expenses", "Invoices",
      "KanbanTasks", "Activities", "Partners",
      "Installments", "Transactions",
      "Promotions", "Referrals", "Payouts",
      "CoinWallets", "CoinTransactions", "GiftCards", "GiftCardTransactions",
      "UserProfiles", "UserRoles", "SchoolCertificates", "CareerProfiles",
      "PromoCodes", "PromoCodeUsages", "CommissionRules", "CommissionLedger",
      "AppNotifications", "EmailTracking", "OfferAcceptanceLog",
    ];
    lists.forEach(l => { listUrls[l] = `${base}/Lists/${l}/AllItems.aspx`; });
  }

  return {
    isProduction,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    hasConfig: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
    siteUrl,
    listUrls,
  };
}

// ============================================================
// SharePoint Internal Field Mappings
// ============================================================
// If your SharePoint list uses internal names like 'field_1', 'field_2' instead 
// of 'Name', 'Email', etc., update these mappings below.
// ============================================================

const CL_COL = { // SCCG Client
  partnerId: "PartnerId",
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  address: "Address",
  createdAt: "CreatedAt",
};

// Legacy intake list used in some live tenants ("SCCG Client") with auto-generated internal names.
// Discovered via scripts/inspect-list.mjs output (e.g. field_2 address, field_3 phone, field_4 email).
const LEGACY_SCCG_CLIENT_COL = {
  name: "Title",
  address: "field_2",
  phone: "field_3",
  email: "field_4",
} as const;

function encodeListName(listDisplayName: string): string {
  // Graph supports /lists/{list-id} or /lists/{list-title}. If using title, it must be URL-encoded.
  return encodeURIComponent(listDisplayName);
}

function escapeODataLiteral(value: string): string {
  return String(value).replace(/'/g, "''");
}

async function resolveFirstExistingListDisplayName(candidates: string[]): Promise<string> {
  const { graphGetSafe, resolveSiteId } = await import("@/lib/graph");
  const siteId = await resolveSiteId();
  for (const name of candidates) {
    const q = escapeODataLiteral(name);
    const res = await graphGetSafe<{ value?: Array<{ id: string; displayName: string }> }>(
      `/sites/${siteId}/lists?$filter=displayName eq '${q}'&$top=1`
    );
    if (res?.value?.[0]?.displayName) return res.value[0].displayName;
  }
  // Fall back to the first candidate (will later surface as 404 via runSafe if missing)
  return candidates[0]!;
}

async function getClientsListName(): Promise<string> {
  // Allow explicit override for tenant-specific naming.
  const override = process.env.SHAREPOINT_CLIENTS_LIST_NAME;
  if (override) return override;
  // Prefer the provisioned list, but fall back to legacy populated list if that's what exists.
  return resolveFirstExistingListDisplayName(["Clients", "SCCG Client"]);
}

const SO_COL = { // SCCG Sales Offers
  offerNumber: "OfferNumber",
  partnerId: "PartnerId",
  partnerName: "PartnerName",
  clientId: "ClientId",
  clientName: "ClientName",
  clientEmail: "ClientEmail",
  status: "Status",
  subtotal: "Subtotal",
  discount: "Discount",
  discountType: "DiscountType",
  totalAmount: "TotalAmount",
  validUntil: "ValidUntil",
  notes: "Notes",
  createdBy: "CreatedBy",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
  sentAt: "SentAt",
  acceptedAt: "AcceptedAt",
  rejectedAt: "RejectedAt",
  salesOrderId: "SalesOrderId",
};

const SOI_COL = { // SCCG Sales Offer Items
  salesOfferId: "SalesOfferId",
  productId: "ProductId",
  productName: "ProductName",
  quantity: "Quantity",
  unitPrice: "UnitPrice",
  totalPrice: "TotalPrice",
};

const ORD_COL = { // SCCG Sales Orders
  orderNumber: "OrderNumber",
  salesOfferId: "SalesOfferId",
  offerNumber: "OfferNumber",
  partnerId: "PartnerId",
  partnerName: "PartnerName",
  clientId: "ClientId",
  clientName: "ClientName",
  clientEmail: "ClientEmail",
  status: "Status",
  totalAmount: "TotalAmount",
  notes: "Notes",
  createdBy: "CreatedBy",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
  completedAt: "CompletedAt",
};

const ORDI_COL = { // SCCG Sales Order Items
  salesOrderId: "SalesOrderId",
  productId: "ProductId",
  productName: "ProductName",
  quantity: "Quantity",
  unitPrice: "UnitPrice",
  totalPrice: "TotalPrice",
};

const ST_COL = { // SCCG Service Tasks
  salesOrderId: "SalesOrderId",
  orderNumber: "OrderNumber",
  title: "Title",
  description: "Description",
  assignedTo: "AssignedTo",
  status: "Status",
  priority: "Priority",
  dueDate: "DueDate",
  completedAt: "CompletedAt",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

const PR_COL = { // SCCG Products
  name: "Title", // Default SharePoint name field
  sku: "Sku",
  unit: "Unit",
  sessionsCount: "SessionsCount",
  retailPriceEur: "RetailPriceEur",
  retailPriceBdt: "RetailPriceBdt",
  category: "Category",
  price: "Price",
  description: "Description",
  stock: "Stock",
  imageUrl: "ImageUrl",
  discount: "Discount",
  discountType: "DiscountType",
  discountExpiry: "DiscountExpiry",
  isAvailable: "IsAvailable",
  tags: "SalesTags",
  sortOrder: "SortOrder",
};

const SO_COL_EXT = { // SCCG Sales Offers — extended fields
  saleType: "SaleType",
  referralId: "ReferralId",
  referralName: "ReferralName",
  referralPercent: "ReferralPercent",
};

const PROMO_COL = { // SCCG Promotions
  title: "Title",
  description: "Description",
  type: "Type",
  appliesTo: "AppliesTo",
  productId: "ProductId",
  category: "Category",
  discountType: "DiscountType",
  discountValue: "DiscountValue",
  startDate: "StartDate",
  endDate: "EndDate",
  isActive: "IsActive",
  imageUrl: "ImageUrl",
  priority: "Priority",
};

const REF_COL = { // SCCG Referrals
  referrerId: "ReferrerId",
  referrerName: "ReferrerName",
  referrerType: "ReferrerType",
  salesOfferId: "SalesOfferId",
  salesOrderId: "SalesOrderId",
  percentage: "Percentage",
  amount: "Amount",
  status: "Status",
  createdAt: "CreatedAt",
};

const ACT_COL = { // SCCG Activities
  clientId: "RelatedId",
  partnerId: "PartnerId",
  type: "Type",
  title: "Title",
  description: "Description",
  createdAt: "CreatedAt",
};

const PAY_COL = { // SCCG Payouts
  recipientId: "RecipientId",
  recipientName: "RecipientName",
  recipientType: "RecipientType",
  relatedOrderId: "RelatedOrderId",
  relatedOrderNumber: "RelatedOrderNumber",
  gross: "Gross",
  deductions: "Deductions",
  net: "Net",
  currency: "Currency",
  status: "Status",
  payoutDate: "PayoutDate",
  notes: "Notes",
  createdAt: "CreatedAt",
};

const EXP_COL = { // SCCG Experts
  name: "Name",
  email: "Email",
  phone: "Phone",
  specialization: "Specialization",
  bio: "Bio",
  status: "Status",
  rating: "Rating",
  totalSessionsCompleted: "TotalSessionsCompleted",
  ratePerSession: "RatePerSession",
  firebaseUid: "FirebaseUid",
  createdAt: "CreatedAt",
};

const UP_COL = { // SCCG User Profiles
  displayName: "Title", // Default SharePoint Name field
  email: "Email",
  phone: "Phone",
  role: "Role",
  company: "Company",
  specialization: "Specialization",
  status: "Status",
  firebaseUid: "FirebaseUid",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

const UR_COL = { // User Roles list
  userAccountId: "UserAccountId",
  role: "Role",
  status: "Status",
  grantedAt: "GrantedAt",
  grantedBy: "GrantedBy",
  revokedAt: "RevokedAt",
  notes: "Notes",
};

const CW_COL = { // Coin Wallets
  userId: "UserId",
  userName: "UserName",
  userEmail: "UserEmail",
  balance: "Balance",
  totalEarned: "TotalEarned",
  totalSpent: "TotalSpent",
  currency: "Currency",
  status: "Status",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

const CT_COL = { // Coin Transactions
  walletId: "WalletId",
  userId: "UserId",
  type: "Type",
  amount: "Amount",
  balanceBefore: "BalanceBefore",
  balanceAfter: "BalanceAfter",
  description: "Description",
  reference: "Reference",
  date: "Date",
  createdBy: "CreatedBy",
};

const PART_COL = { // SCCG Partners
  name: "Title",
  email: "Email",
  passwordHash: "PasswordHash",
  role: "Role",
  status: "Status",
  company: "Company",
  phone: "Phone",
  partnerType: "PartnerType",
  commissionTier: "CommissionTier",
  onboardingStatus: "OnboardingStatus",
  createdAt: "CreatedAt",
};

const KT_COL = { // Kanban Tasks
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  dueDate: "DueDate",
  assignedTo: "AssignedTo",
  assignedToName: "AssignedToName",
  assignedToEmail: "AssignedToEmail",
  tags: "Tags",
  comments: "Comments",
  createdBy: "CreatedBy",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

const SP_COL = { // Service Packages
  name: "Title",
  category: "Category",
  description: "Description",
  price: "Price",
  sessionsCount: "SessionsCount",
  durationWeeks: "DurationWeeks",
  isFeatured: "IsFeatured",
  isActive: "IsActive",
};

const CP_COL = { // Customer Packages
  customerId: "CustomerId",
  clientName: "ClientName",
  partnerId: "PartnerId",
  packageId: "PackageId",
  packageName: "PackageName",
  expertId: "ExpertId",
  expertName: "ExpertName",
  status: "Status",
  sessionsRemaining: "SessionsRemaining",
  totalSessions: "TotalSessions",
  totalAmount: "TotalAmount",
  amountPaid: "AmountPaid",
  startDate: "StartDate",
  endDate: "EndDate",
  createdAt: "CreatedAt",
};

const SESS_COL = { // Sessions
  packageId: "PackageId",
  customerId: "CustomerId",
  clientName: "ClientName",
  partnerId: "PartnerId",
  expertId: "ExpertId",
  expertName: "ExpertName",
  status: "Status",
  sessionNumber: "SessionNumber",
  totalSessions: "TotalSessions",
  scheduledAt: "ScheduledAt",
  completedAt: "CompletedAt",
  durationMinutes: "DurationMinutes",
  meetingUrl: "MeetingUrl",
  expertNotes: "ExpertNotes",
  studentNotes: "StudentNotes",
  createdAt: "CreatedAt",
};

// ============================================================
// Partners
// ============================================================

// ============================================================
// Partners
// ============================================================
export async function getPartnerByEmail(email: string): Promise<Partner | null> {
  // Graph API implementation (use when SharePoint is configured)
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Partners")}?$filter=fields/${PART_COL.email} eq '${email}'&$expand=fields`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
  if (!res.value.length) return null;
  const item = res.value[0];
  const f = item.fields;
  return { 
    id: String(item.id), 
    name: String(f[PART_COL.name] || ""), 
    email: String(f[PART_COL.email] || ""), 
    passwordHash: String(f[PART_COL.passwordHash] || ""), 
    role: String(f[PART_COL.role] || "partner") as Partner["role"], 
    status: String(f[PART_COL.status] || "active") as Partner["status"], 
    company: String(f[PART_COL.company] || ""), 
    partnerType: (f[PART_COL.partnerType] as any) || "individual",
    commissionTier: (f[PART_COL.commissionTier] as any) || "standard",
    onboardingStatus: (f[PART_COL.onboardingStatus] as any) || "approved",
    createdAt: String(f[PART_COL.createdAt] || new Date().toISOString()) 
  } as Partner;
}

export async function getPartners(): Promise<Partner[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(
        `${await getSiteListUrlAsync("Partners")}?$expand=fields`
      );
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(item.id),
          name: String(f[PART_COL.name] || ""),
          email: String(f[PART_COL.email] || ""),
          passwordHash: String(f[PART_COL.passwordHash] || ""),
          role: (f[PART_COL.role] as any) || "partner",
          status: (f[PART_COL.status] as any) || "active",
          company: String(f[PART_COL.company] || ""),
          phone: String(f[PART_COL.phone] || ""),
          partnerType: (f[PART_COL.partnerType] as any) || "individual",
          commissionTier: (f[PART_COL.commissionTier] as any) || "standard",
          onboardingStatus: (f[PART_COL.onboardingStatus] as any) || "approved",
          createdAt: String(f[PART_COL.createdAt] || ""),
        } as Partner;
      });
    }
  );
}

export async function createPartner(data: Omit<Partner, "id" | "createdAt">): Promise<Partner> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
    [PART_COL.name]: data.name,
    [PART_COL.email]: data.email,
    [PART_COL.passwordHash]: data.passwordHash,
    [PART_COL.role]: data.role,
    [PART_COL.status]: data.status,
    [PART_COL.company]: data.company,
    [PART_COL.phone]: data.phone,
    [PART_COL.partnerType]: data.partnerType,
    [PART_COL.commissionTier]: data.commissionTier,
    [PART_COL.onboardingStatus]: data.onboardingStatus,
    [PART_COL.createdAt]: new Date().toISOString(),
  };
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Partners"), { fields: body });
  return { ...data, id: String(res.id), createdAt: body[PART_COL.createdAt] as string };
}

export async function updatePartnerStatus(id: string, status: Partner["status"]): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Partners")}/${id}/fields`, { [PART_COL.status]: status });
}

// ============================================================
// Products
// ============================================================
export async function getProducts(): Promise<Product[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
        `${await getSiteListUrlAsync("Products")}?$expand=fields`
      );
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(item.id),
          sku: String(f[PR_COL.sku] || ""),
          name: String(f[PR_COL.name] || ""),
          description: String(f[PR_COL.description] || ""),
          unit: String(f[PR_COL.unit] || "Package") as "Package" | "Session" | "Course" | "Card",
          sessionsCount: Number(f[PR_COL.sessionsCount] || 0),
          retailPriceEur: Number(f[PR_COL.retailPriceEur] || 0),
          retailPriceBdt: Number(f[PR_COL.retailPriceBdt] || 0),
          price: Number(f[PR_COL.price] || f[PR_COL.retailPriceBdt] || 0),
          stock: Number(f[PR_COL.stock] || 0),
          category: String(f[PR_COL.category] || ""),
          imageUrl: f[PR_COL.imageUrl] ? String(f[PR_COL.imageUrl]) : undefined,
          discount: f[PR_COL.discount] ? Number(f[PR_COL.discount]) : undefined,
          discountType: f[PR_COL.discountType] ? String(f[PR_COL.discountType]) as "fixed" | "percent" : undefined,
          discountExpiry: f[PR_COL.discountExpiry] ? String(f[PR_COL.discountExpiry]) : undefined,
          isAvailable: f[PR_COL.isAvailable] !== undefined ? Boolean(f[PR_COL.isAvailable]) : true,
          tags: f[PR_COL.tags] ? String(f[PR_COL.tags]).split(",").filter(Boolean) : [],
          sortOrder: Number(f[PR_COL.sortOrder] || 0),
        } as Product;
      });
    }
  );
}

export async function createProduct(data: Omit<Product, "id">): Promise<Product> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
    [PR_COL.name]: data.name,
    [PR_COL.category]: data.category,
    [PR_COL.price]: data.price,
    [PR_COL.description]: data.description,
    [PR_COL.stock]: data.stock,
    [PR_COL.imageUrl]: data.imageUrl,
    [PR_COL.discount]: data.discount,
    [PR_COL.discountType]: data.discountType,
    [PR_COL.discountExpiry]: data.discountExpiry,
    [PR_COL.isAvailable]: data.isAvailable,
    [PR_COL.tags]: data.tags?.join(","),
    [PR_COL.sortOrder]: data.sortOrder,
  };
  const res = await graphPost<{ id: string }>(`${await getSiteListUrlAsync("Products")}`, { fields: body });
  return { ...data, id: res.id };
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body[PR_COL.name] = data.name;
  if (data.category !== undefined) body[PR_COL.category] = data.category;
  if (data.price !== undefined) body[PR_COL.price] = data.price;
  if (data.description !== undefined) body[PR_COL.description] = data.description;
  if (data.stock !== undefined) body[PR_COL.stock] = data.stock;
  if (data.imageUrl !== undefined) body[PR_COL.imageUrl] = data.imageUrl;
  if (data.discount !== undefined) body[PR_COL.discount] = data.discount;
  if (data.discountType !== undefined) body[PR_COL.discountType] = data.discountType;
  if (data.discountExpiry !== undefined) body[PR_COL.discountExpiry] = data.discountExpiry;
  if (data.isAvailable !== undefined) body[PR_COL.isAvailable] = data.isAvailable;
  if (data.tags !== undefined) body[PR_COL.tags] = data.tags.join(",");
  if (data.sortOrder !== undefined) body[PR_COL.sortOrder] = data.sortOrder;
  await graphPatch(`${await getSiteListUrlAsync("Products")}/${id}/fields`, body);
}

export async function deleteProduct(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Products")}/${id}`);
}

export async function toggleProductHold(id: string, hold: boolean): Promise<void> {
  await updateProduct(id, { isAvailable: !hold });
}

// ============================================================
// Orders
// ============================================================
export async function getOrders(partnerId?: string): Promise<Order[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("Orders")}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(item.id), partnerId: String(f.PartnerId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), items: JSON.parse(String(f.Items || "[]")), status: String(f.Status), totalAmount: Number(f.TotalAmount), createdAt: String(f.CreatedAt) } as Order;
      });
    }
  );
}

export async function createOrder(order: Omit<Order, "id">): Promise<Order> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Orders"), { fields: { PartnerId: order.partnerId, ClientId: order.clientId, ClientName: order.clientName, Items: JSON.stringify(order.items), Status: order.status, TotalAmount: order.totalAmount, CreatedAt: order.createdAt } });
  return { ...order, id: String(res.id) } as Order;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Orders")}/${id}/fields`, { Status: status });
}

// ============================================================
// Clients
// ============================================================
export async function getClients(partnerId?: string): Promise<Client[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const listName = await getClientsListName();
      const listUrl = await getSiteListUrlAsync(encodeListName(listName));
      let url = `${listUrl}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, string> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        if (listName === "SCCG Client") {
          return {
            id: String(item.id),
            partnerId: "",
            name: String((f as any)[LEGACY_SCCG_CLIENT_COL.name] || ""),
            email: String((f as any)[LEGACY_SCCG_CLIENT_COL.email] || ""),
            phone: String((f as any)[LEGACY_SCCG_CLIENT_COL.phone] || ""),
            company: "",
            address: String((f as any)[LEGACY_SCCG_CLIENT_COL.address] || ""),
            createdAt: String((f as any).Created || ""),
          } as Client;
        }
        return { id: String(item.id), partnerId: f.PartnerId, name: f.Name, email: f.Email, phone: f.Phone, company: f.Company, address: f.Address, isOnHold: !!f.IsOnHold, createdAt: f.CreatedAt } as Client;
      });
    }
  );
}


export async function getClientById(id: string): Promise<Client | null> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const listName = await getClientsListName();
  const url = `${await getSiteListUrlAsync(encodeListName(listName))}/${id}?$expand=fields`;
  const res = await graphGet<{ id: string; fields: Record<string, any> }>(url);
  const f = res.fields;
  if (listName === "SCCG Client") {
    return {
      id: String(res.id),
      partnerId: "",
      name: String(f[LEGACY_SCCG_CLIENT_COL.name] || ""),
      email: String(f[LEGACY_SCCG_CLIENT_COL.email] || ""),
      phone: String(f[LEGACY_SCCG_CLIENT_COL.phone] || ""),
      company: "",
      address: String(f[LEGACY_SCCG_CLIENT_COL.address] || ""),
      createdAt: String(f.Created || ""),
    } as Client;
  }
  return { id: String(res.id), partnerId: String(f.PartnerId || ""), name: String(f.Name || ""), email: String(f.Email || ""), phone: String(f.Phone || ""), company: String(f.Company || ""), address: String(f.Address || ""), isOnHold: !!f.IsOnHold, createdAt: String(f.CreatedAt || "") } as Client;
}

export async function createClient(client: Omit<Client, "id">): Promise<Client> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const listName = await getClientsListName();
  const isLegacy = listName === "SCCG Client";
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(encodeListName(listName)), {
    fields: isLegacy
      ? {
          [LEGACY_SCCG_CLIENT_COL.name]: client.name,
          [LEGACY_SCCG_CLIENT_COL.email]: client.email,
          [LEGACY_SCCG_CLIENT_COL.phone]: client.phone,
          [LEGACY_SCCG_CLIENT_COL.address]: client.address,
        }
      : {
          PartnerId: client.partnerId,
          Name: client.name,
          Email: client.email,
          Phone: client.phone,
          Company: client.company,
          Address: client.address,
          CreatedAt: client.createdAt,
        },
  });
  return { ...client, partnerId: isLegacy ? "" : client.partnerId, id: String(res.id) } as Client;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const listName = await getClientsListName();
  const fields: Record<string, unknown> = {};

  if (listName === "SCCG Client") {
    if (data.name !== undefined) fields["Title"] = data.name;
    if (data.email !== undefined) fields["field_4"] = data.email;
    if (data.phone !== undefined) fields["field_3"] = data.phone;
    if (data.address !== undefined) fields["field_2"] = data.address;
    await graphPatch(`${await getSiteListUrlAsync(encodeListName(listName))}/${id}/fields`, fields);
    return;
  }

  // Standard "Clients" list mapping
  if (data.name !== undefined) fields["Name"] = data.name;
  if (data.email !== undefined) fields["Email"] = data.email;
  if (data.phone !== undefined) fields["Phone"] = data.phone;
  if (data.company !== undefined) fields["Company"] = data.company;
  if (data.address !== undefined) fields["Address"] = data.address;
  if (data.partnerId !== undefined) fields["PartnerId"] = data.partnerId;
  if ((data as any).isOnHold !== undefined) fields["IsOnHold"] = (data as any).isOnHold;

  await graphPatch(`${await getSiteListUrlAsync("Clients")}/${id}/fields`, fields);
}

export async function deleteClient(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  const listName = await getClientsListName();
  await graphDelete(`${await getSiteListUrlAsync(encodeListName(listName))}/${id}`);
}

// ============================================================
// Activities
// ============================================================


// ============================================================
// Financials
// ============================================================
export async function getFinancials(partnerId?: string): Promise<Financial[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("Financials")}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, string | number> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(item.id), partnerId: String(f.PartnerId), period: String(f.Period), revenue: Number(f.Revenue), outstanding: Number(f.Outstanding), paid: Number(f.Paid), createdAt: String(f.CreatedAt) } as Financial;
      });
    }
  );
}

// ============================================================
// Installments
// ============================================================
export async function getInstallments(partnerId?: string): Promise<Installment[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("Installments")}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(item.id), orderId: String(f.OrderId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), partnerId: String(f.PartnerId), installmentNumber: Number(f.InstallmentNumber), totalInstallments: Number(f.TotalInstallments), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, dueDate: String(f.DueDate), paidDate: f.PaidDate ? String(f.PaidDate) : undefined, status: String(f.Status), notes: f.Notes ? String(f.Notes) : undefined } as Installment;
      });
    }
  );
}

export async function getInstallmentsByClient(clientId: string): Promise<Installment[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Installments")}?$expand=fields&$filter=fields/ClientId eq '${clientId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), orderId: String(f.OrderId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), partnerId: String(f.PartnerId), installmentNumber: Number(f.InstallmentNumber), totalInstallments: Number(f.TotalInstallments), amount: Number(f.Amount), dueDate: String(f.DueDate), paidDate: f.PaidDate ? String(f.PaidDate) : undefined, status: String(f.Status) } as Installment;
  });
}

export async function createInstallmentPlan(orderId: string, clientId: string, clientName: string, partnerId: string, totalAmount: number, numInstallments: number, startDate: string): Promise<Installment[]> {
  const amount = Math.round((totalAmount / numInstallments) * 100) / 100;
  const installments: Installment[] = [];
  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("./currency");
    rate = await getBdtToEurRate();
  } catch (err) {
    rate = null;
  }
  for (let i = 0; i < numInstallments; i++) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i);
    const inst: Installment = {
      id: "pending",
      orderId, clientId, clientName, partnerId,
      installmentNumber: i + 1,
      totalInstallments: numInstallments,
      amount,
      amountEur: rate ? Math.round((amount * rate + Number.EPSILON) * 100) / 100 : undefined,
      conversionRate: rate ?? undefined,
      dueDate: due.toISOString().slice(0, 10),
      status: "upcoming",
    };
    installments.push(inst);
  }

  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = await getSiteListUrlAsync("Installments");
    const created: Installment[] = [];
    for (const inst of installments) {
      try {
        const res = await graphPost<{ id: string }>(url, {
          fields: {
            OrderId: inst.orderId,
            ClientId: inst.clientId,
            ClientName: inst.clientName,
            PartnerId: inst.partnerId,
            InstallmentNumber: inst.installmentNumber,
            TotalInstallments: inst.totalInstallments,
            Amount: inst.amount,
            AmountEur: inst.amountEur,
            ConversionRate: inst.conversionRate,
            DueDate: inst.dueDate,
            Status: inst.status,
          },
        });
        created.push({ ...inst, id: String(res.id) });
      } catch (e) {
        console.error(`Failed to persist installment #${inst.installmentNumber} for order ${orderId}:`, (e as Error).message);
        created.push(inst);
      }
    }
    return created;
  } catch (e) {
    console.error("Installment persistence failed (Graph unreachable):", (e as Error).message);
    return installments;
  }
}

export async function markInstallmentPaid(id: string, paidDate: string): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Installments")}/${id}/fields`, { Status: "paid", PaidDate: paidDate });
}

// ============================================================
// Transactions
// ============================================================
export async function getTransactions(partnerId?: string): Promise<Transaction[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Transactions")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(item.id), clientId: String(f.ClientId), partnerId: String(f.PartnerId), type: String(f.Type), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, reference: String(f.Reference), orderId: f.OrderId ? String(f.OrderId) : undefined, description: f.Description ? String(f.Description) : undefined, date: String(f.Date) } as Transaction;
  });
}

export async function getTransactionsByClient(clientId: string): Promise<Transaction[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Transactions")}?$expand=fields&$filter=fields/ClientId eq '${clientId}'`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(item.id), clientId: String(f.ClientId), partnerId: String(f.PartnerId), type: String(f.Type), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, reference: String(f.Reference), orderId: f.OrderId ? String(f.OrderId) : undefined, description: f.Description ? String(f.Description) : undefined, date: String(f.Date) } as Transaction;
  });
}

export async function createTransaction(tx: Omit<Transaction, "id">): Promise<Transaction> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Transactions"), { fields: { ClientId: tx.clientId, PartnerId: tx.partnerId, Type: tx.type, Amount: tx.amount, Reference: tx.reference, OrderId: tx.orderId, Description: tx.description, Date: tx.date } });
  return { ...tx, id: String(res.id) } as Transaction;
}

// ============================================================
// Expenses
// ============================================================
export async function getExpenses(partnerId?: string): Promise<Expense[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Expenses")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, string | number> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(item.id), partnerId: String(f.PartnerId), category: String(f.Category), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, description: String(f.Description), date: String(f.Date) } as Expense;
  });
}

export async function createExpense(expense: Omit<Expense, "id">): Promise<Expense> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Expenses"), {
      fields: {
        Title: expense.description,
        Amount: expense.amount,
        Category: expense.category,
        Date: expense.date,
        PartnerId: expense.partnerId,
      },
    });
    return { ...expense, id: String(res.id) } as Expense;
  } catch (err) {
    console.error("createExpense live write failed:", err);
    return { ...expense, id: "failed" } as Expense;
  }
}

// ============================================================
// Invoices
// ============================================================
export async function getInvoices(partnerId?: string): Promise<Invoice[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Invoices")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(item.id), partnerId: String(f.PartnerId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), orderId: f.OrderId ? String(f.OrderId) : undefined, amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, status: String(f.Status), dueDate: String(f.DueDate), createdAt: String(f.CreatedAt) } as Invoice;
  });
}

export async function createInvoice(invoice: Omit<Invoice, "id">): Promise<Invoice> {
  const { getBdtToEurRate } = await import("./currency");
  const rate = await getBdtToEurRate();
  const amountEur = Math.round((invoice.amount * rate + Number.EPSILON) * 100) / 100;
  
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Invoices"), { fields: { PartnerId: invoice.partnerId, ClientId: invoice.clientId, ClientName: invoice.clientName, OrderId: invoice.orderId, Amount: invoice.amount, AmountEUR: amountEur, ConversionRate: rate, Status: invoice.status, DueDate: invoice.dueDate, CreatedAt: invoice.createdAt } });
  return { ...invoice, id: String(res.id) } as Invoice;
}

// ============================================================
// Customers
// ============================================================
export async function getCustomers(partnerId?: string): Promise<Customer[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const listName = await getClientsListName();
      let url = `${await getSiteListUrlAsync(encodeListName(listName))}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/${CL_COL.partnerId} eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        const isLegacy = listName === "SCCG Client";
        return {
          id: String(item.id),
          name: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.name] : f[CL_COL.name]) || f.Title || ""),
          email: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.email] : f[CL_COL.email]) || ""),
          phone: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.phone] : f[CL_COL.phone]) || ""),
          company: String(f[CL_COL.company] || ""),
          address: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.address] : f[CL_COL.address]) || ""),
          partnerId: String(f[CL_COL.partnerId] || ""),
          status: (f.Status as any) || "active",
          createdAt: String(f[CL_COL.createdAt] || ""),
        } as Customer;
      });
    }
  );
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const listName = await getClientsListName();
    const url = `${await getSiteListUrlAsync(encodeListName(listName))}/${id}?$expand=fields`;
    const item = await graphGet<{ id: string; fields: Record<string, any> }>(url);
    if (!item) return null;
    const f = item.fields;
    const isLegacy = listName === "SCCG Client";
    return {
      id: String(item.id),
      name: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.name] : f[CL_COL.name]) || f.Title || ""),
      email: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.email] : f[CL_COL.email]) || ""),
      phone: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.phone] : f[CL_COL.phone]) || ""),
      company: String(f[CL_COL.company] || ""),
      address: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.address] : f[CL_COL.address]) || ""),
      partnerId: String(f[CL_COL.partnerId] || ""),
      status: (f.Status as any) || "active",
      createdAt: String(f[CL_COL.createdAt] || ""),
    } as Customer;
  }, () => null);
}

export async function createCustomer(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const createdAt = new Date().toISOString();
  const listName = await getClientsListName();
  const isLegacy = listName === "SCCG Client";
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(encodeListName(listName)), {
    fields: {
      ...(isLegacy
        ? {
            [LEGACY_SCCG_CLIENT_COL.name]: data.name,
            [LEGACY_SCCG_CLIENT_COL.email]: data.email,
            [LEGACY_SCCG_CLIENT_COL.phone]: data.phone,
            [LEGACY_SCCG_CLIENT_COL.address]: (data as any).address || "",
          }
        : {
            [CL_COL.name]: data.name,
            [CL_COL.email]: data.email,
            [CL_COL.phone]: data.phone,
            [CL_COL.address]: (data as any).address || "",
          }),
      [CL_COL.company]: data.company,
      [CL_COL.partnerId]: data.partnerId,
      [CL_COL.createdAt]: createdAt,
      Status: data.status || "active",
    },
  });
  return { ...data, id: String(res.id), createdAt };
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const listName = await getClientsListName();
    const isLegacy = listName === "SCCG Client";
    const emailCol = isLegacy ? LEGACY_SCCG_CLIENT_COL.email : CL_COL.email;
    const url = `${await getSiteListUrlAsync(encodeListName(listName))}?$expand=fields&$filter=fields/${emailCol} eq '${escapeOData(email)}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    if (!res.value.length) return null;
    const item = res.value[0];
    const f = item.fields;
    return {
      id: String(item.id),
      name: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.name] : f[CL_COL.name]) || f.Title || ""),
      email: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.email] : f[CL_COL.email]) || ""),
      phone: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.phone] : f[CL_COL.phone]) || ""),
      company: String(f[CL_COL.company] || ""),
      address: String((isLegacy ? f[LEGACY_SCCG_CLIENT_COL.address] : f[CL_COL.address]) || ""),
      partnerId: String(f[CL_COL.partnerId] || ""),
      status: (f.Status as any) || "active",
      createdAt: String(f[CL_COL.createdAt] || ""),
    } as Customer;
  }, () => null);
}



// ============================================================
// Experts
// ============================================================
export async function getExperts(): Promise<Expert[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const url = `${await getSiteListUrlAsync("Experts")}?$expand=fields`;
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(item.id),
          name: String(f[EXP_COL.name] || f.Title || ""),
          email: String(f[EXP_COL.email] || ""),
          phone: String(f[EXP_COL.phone] || ""),
          specialization: String(f[EXP_COL.specialization] || ""),
          status: (f[EXP_COL.status] as any) || "active",
          rating: Number(f[EXP_COL.rating] || 0),
          createdAt: String(f[EXP_COL.createdAt] || ""),
        } as Expert;
      });
    }
  );
}

export async function getExpertById(id: string): Promise<Expert | null> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const url = `${await getSiteListUrlAsync("Experts")}?$filter=fields/${EXP_COL.firebaseUid} eq '${id}'&$expand=fields`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    if (!res.value.length) return null;
    const f = res.value[0].fields;
    const item = res.value[0];
    return {
      id: item.id,
      name: String(f[EXP_COL.name] || ""),
      email: String(f[EXP_COL.email] || ""),
      phone: f[EXP_COL.phone] ? String(f[EXP_COL.phone]) : undefined,
      specialization: String(f[EXP_COL.specialization] || ""),
      bio: f[EXP_COL.bio] ? String(f[EXP_COL.bio]) : undefined,
      status: String(f[EXP_COL.status] || "active") as Expert["status"],
      rating: Number(f[EXP_COL.rating] || 0),
      totalSessionsCompleted: Number(f[EXP_COL.totalSessionsCompleted] || 0),
      ratePerSession: Number(f[EXP_COL.ratePerSession] || 0),
      createdAt: String(f[EXP_COL.createdAt] || ""),
    } as Expert;
  } catch (err) {
    return null;
  }
}

export async function createExpert(expert: Omit<Expert, "id"> & { id: string }): Promise<Expert> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Experts"), {
    fields: {
      [EXP_COL.name]: expert.name,
      [EXP_COL.email]: expert.email,
      [EXP_COL.phone]: expert.phone || "",
      [EXP_COL.specialization]: expert.specialization,
      [EXP_COL.bio]: expert.bio || "",
      [EXP_COL.status]: expert.status,
      [EXP_COL.rating]: expert.rating,
      [EXP_COL.totalSessionsCompleted]: expert.totalSessionsCompleted,
      [EXP_COL.ratePerSession]: expert.ratePerSession,
      [EXP_COL.firebaseUid]: expert.id,
      [EXP_COL.createdAt]: expert.createdAt,
    },
  });
  return { ...expert, id: res.id };
}

export async function getExpertByEmail(email: string): Promise<Expert | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("Experts")}?$expand=fields&$filter=fields/${EXP_COL.email} eq '${email}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    if (!res.value.length) return null;
    const f = res.value[0].fields;
    const item = res.value[0];
    return {
      id: String(item.id),
      name: String(f[EXP_COL.name] || f.Title || ""),
      email: String(f[EXP_COL.email] || ""),
      phone: String(f[EXP_COL.phone] || ""),
      specialization: String(f[EXP_COL.specialization] || ""),
      status: (f[EXP_COL.status] as any) || "active",
      rating: Number(f[EXP_COL.rating] || 0),
      createdAt: String(f[EXP_COL.createdAt] || ""),
    } as Expert;
  }, () => null);
}

export async function updateExpertStatus(id: string, status: Expert["status"]): Promise<void> {
}

// ============================================================
// Service Packages
// ============================================================
export async function getServicePackages(): Promise<ServicePackage[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(
      `${await getSiteListUrlAsync("ServicePackages")}?$expand=fields`
    );
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        name: String(f[SP_COL.name] || ""),
        category: String(f[SP_COL.category] || ""),
        description: String(f[SP_COL.description] || ""),
        price: Number(f[SP_COL.price] || 0),
        totalSessions: Number(f[SP_COL.sessionsCount] || 0),
        sessionDurationMinutes: 60,
        validityDays: Number(f[SP_COL.durationWeeks] || 0) * 7,
        isFeatured: Boolean(f[SP_COL.isFeatured]),
        isActive: Boolean(f[SP_COL.isActive]),
      } as ServicePackage;
    });
  }, () => []);
}

// ============================================================
// Customer Packages
// ============================================================
export async function getCustomerPackages(customerId?: string, partnerId?: string): Promise<CustomerPackage[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("CustomerPackages")}?$expand=fields`;
    const filters: string[] = [];
    if (customerId) filters.push(`fields/${CP_COL.customerId} eq '${customerId}'`);
    if (filters.length > 0) url += `&$filter=${filters.join(" and ")}`;
    
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        customerId: String(f[CP_COL.customerId] || ""),
        clientName: String(f[CP_COL.clientName] || ""),
        partnerId: String(f[CP_COL.partnerId] || ""),
        servicePackageId: String(f[CP_COL.packageId] || ""),
        packageName: String(f[CP_COL.packageName] || ""),
        expertId: f[CP_COL.expertId] ? String(f[CP_COL.expertId]) : undefined,
        expertName: f[CP_COL.expertName] ? String(f[CP_COL.expertName]) : undefined,
        status: String(f[CP_COL.status] || "active") as any,
        completedSessions: Number(f[CP_COL.totalSessions] || 0) - Number(f[CP_COL.sessionsRemaining] || 0),
        totalSessions: Number(f[CP_COL.totalSessions] || 0),
        totalAmount: Number(f[CP_COL.totalAmount] || 0),
        amountPaid: Number(f[CP_COL.amountPaid] || 0),
        startDate: f[CP_COL.startDate] ? String(f[CP_COL.startDate]) : undefined,
        endDate: f[CP_COL.endDate] ? String(f[CP_COL.endDate]) : undefined,
        createdAt: String(f[CP_COL.createdAt] || ""),
      } as CustomerPackage;
    });
  }, () => []);
}

export async function getCustomerPackageById(id: string): Promise<CustomerPackage | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("CustomerPackages")}/${id}?$expand=fields`;
    const res = await graphGet<{ id: string; fields: Record<string, any> }>(url);
    const f = res.fields;
    return {
      id: String(res.id),
      customerId: String(f[CP_COL.customerId] || ""),
      clientName: String(f[CP_COL.clientName] || ""),
      partnerId: String(f[CP_COL.partnerId] || ""),
      servicePackageId: String(f[CP_COL.packageId] || ""),
      packageName: String(f[CP_COL.packageName] || ""),
      expertId: f[CP_COL.expertId] ? String(f[CP_COL.expertId]) : undefined,
      expertName: f[CP_COL.expertName] ? String(f[CP_COL.expertName]) : undefined,
      status: String(f[CP_COL.status] || "active") as any,
      completedSessions: Number(f[CP_COL.totalSessions] || 0) - Number(f[CP_COL.sessionsRemaining] || 0),
      totalSessions: Number(f[CP_COL.totalSessions] || 0),
      totalAmount: Number(f[CP_COL.totalAmount] || 0),
      amountPaid: Number(f[CP_COL.amountPaid] || 0),
      startDate: f[CP_COL.startDate] ? String(f[CP_COL.startDate]) : undefined,
      endDate: f[CP_COL.endDate] ? String(f[CP_COL.endDate]) : undefined,
      createdAt: String(f[CP_COL.createdAt] || ""),
    } as CustomerPackage;
  }, () => null);
}

export async function createCustomerPackage(pkg: Omit<CustomerPackage, "id">): Promise<CustomerPackage> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("CustomerPackages"), {
    fields: {
      [CP_COL.customerId]: pkg.customerId,
      [CP_COL.clientName]: pkg.customerName || "",
      [CP_COL.partnerId]: pkg.partnerId,
      [CP_COL.packageId]: pkg.servicePackageId,
      [CP_COL.packageName]: pkg.packageName,
      [CP_COL.expertId]: pkg.expertId || null,
      [CP_COL.expertName]: pkg.expertName || null,
      [CP_COL.status]: pkg.status,
      [CP_COL.sessionsRemaining]: pkg.totalSessions - pkg.completedSessions,
      [CP_COL.totalSessions]: pkg.totalSessions,
      [CP_COL.totalAmount]: pkg.totalAmount,
      [CP_COL.amountPaid]: pkg.amountPaid,
      [CP_COL.startDate]: pkg.startDate || null,
      [CP_COL.endDate]: pkg.endDate || null,
      [CP_COL.createdAt]: pkg.createdAt,
    }
  });
  return { ...pkg, id: String(res.id) } as CustomerPackage;
}

/** Assign expert to a customer package and all its unassigned sessions. */
export async function assignExpertToPackage(packageId: string, expertId: string): Promise<void> {
}

// ============================================================
// Sessions
// ============================================================
export async function getSessionsByPackage(packageId: string): Promise<Session[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("Sessions")}?$expand=fields&$filter=fields/${SESS_COL.packageId} eq '${packageId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        customerPackageId: String(f[SESS_COL.packageId] || ""),
        customerId: String(f[SESS_COL.customerId] || ""),
        customerName: String(f[SESS_COL.clientName] || ""),
        expertId: f[SESS_COL.expertId] ? String(f[SESS_COL.expertId]) : undefined,
        expertName: f[SESS_COL.expertName] ? String(f[SESS_COL.expertName]) : undefined,
        partnerId: String(f[SESS_COL.partnerId] || ""),
        sessionNumber: Number(f[SESS_COL.sessionNumber] || 0),
        totalSessions: Number(f[SESS_COL.totalSessions] || 0),
        status: String(f[SESS_COL.status] || "pending") as any,
        scheduledAt: f[SESS_COL.scheduledAt] ? String(f[SESS_COL.scheduledAt]) : undefined,
        completedAt: f[SESS_COL.completedAt] ? String(f[SESS_COL.completedAt]) : undefined,
        durationMinutes: Number(f[SESS_COL.durationMinutes] || 0),
        notes: String(f[SESS_COL.studentNotes] || ""),
        expertNotes: String(f[SESS_COL.expertNotes] || ""),
        createdAt: String(f[SESS_COL.createdAt] || ""),
      } as Session;
    });
  }, () => []);
}
export async function getSessionsByExpert(expertId: string): Promise<Session[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("Sessions")}?$expand=fields&$filter=fields/${SESS_COL.expertId} eq '${expertId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        customerPackageId: String(f[SESS_COL.packageId] || ""),
        customerId: String(f[SESS_COL.customerId] || ""),
        customerName: String(f[SESS_COL.clientName] || ""),
        expertId: f[SESS_COL.expertId] ? String(f[SESS_COL.expertId]) : undefined,
        expertName: f[SESS_COL.expertName] ? String(f[SESS_COL.expertName]) : undefined,
        partnerId: String(f[SESS_COL.partnerId] || ""),
        sessionNumber: Number(f[SESS_COL.sessionNumber] || 0),
        totalSessions: Number(f[SESS_COL.totalSessions] || 0),
        status: String(f[SESS_COL.status] || "pending") as any,
        scheduledAt: f[SESS_COL.scheduledAt] ? String(f[SESS_COL.scheduledAt]) : undefined,
        completedAt: f[SESS_COL.completedAt] ? String(f[SESS_COL.completedAt]) : undefined,
        durationMinutes: Number(f[SESS_COL.durationMinutes] || 0),
        notes: String(f[SESS_COL.studentNotes] || ""),
        expertNotes: String(f[SESS_COL.expertNotes] || ""),
        createdAt: String(f[SESS_COL.createdAt] || ""),
      } as Session;
    });
  }, () => []);
}

export async function getSessionsByCustomer(customerId: string): Promise<Session[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("Sessions")}?$expand=fields&$filter=fields/${SESS_COL.customerId} eq '${customerId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        customerPackageId: String(f[SESS_COL.packageId] || ""),
        customerId: String(f[SESS_COL.customerId] || ""),
        customerName: String(f[SESS_COL.clientName] || ""),
        expertId: f[SESS_COL.expertId] ? String(f[SESS_COL.expertId]) : undefined,
        expertName: f[SESS_COL.expertName] ? String(f[SESS_COL.expertName]) : undefined,
        partnerId: String(f[SESS_COL.partnerId] || ""),
        sessionNumber: Number(f[SESS_COL.sessionNumber] || 0),
        totalSessions: Number(f[SESS_COL.totalSessions] || 0),
        status: String(f[SESS_COL.status] || "pending") as any,
        scheduledAt: f[SESS_COL.scheduledAt] ? String(f[SESS_COL.scheduledAt]) : undefined,
        completedAt: f[SESS_COL.completedAt] ? String(f[SESS_COL.completedAt]) : undefined,
        durationMinutes: Number(f[SESS_COL.durationMinutes] || 0),
        notes: String(f[SESS_COL.studentNotes] || ""),
        expertNotes: String(f[SESS_COL.expertNotes] || ""),
        createdAt: String(f[SESS_COL.createdAt] || ""),
      } as Session;
    });
  }, () => []);
}

export async function getSessionById(id: string): Promise<Session | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const item = await graphGet<{ id: string; fields: Record<string, any> }>(`${await getSiteListUrlAsync("Sessions")}/${id}?$expand=fields`);
    const f = item.fields;
    return {
      id: String(item.id),
      customerPackageId: String(f[SESS_COL.packageId] || ""),
      customerId: String(f[SESS_COL.customerId] || ""),
      customerName: String(f[SESS_COL.clientName] || ""),
      expertId: f[SESS_COL.expertId] ? String(f[SESS_COL.expertId]) : undefined,
      expertName: f[SESS_COL.expertName] ? String(f[SESS_COL.expertName]) : undefined,
      partnerId: String(f[SESS_COL.partnerId] || ""),
      sessionNumber: Number(f[SESS_COL.sessionNumber] || 0),
      totalSessions: Number(f[SESS_COL.totalSessions] || 0),
      status: String(f[SESS_COL.status] || "pending") as any,
      scheduledAt: f[SESS_COL.scheduledAt] ? String(f[SESS_COL.scheduledAt]) : undefined,
      completedAt: f[SESS_COL.completedAt] ? String(f[SESS_COL.completedAt]) : undefined,
      durationMinutes: Number(f[SESS_COL.durationMinutes] || 0),
      notes: String(f[SESS_COL.studentNotes] || ""),
      expertNotes: String(f[SESS_COL.expertNotes] || ""),
      createdAt: String(f[SESS_COL.createdAt] || ""),
    } as Session;
  }, () => null);
}

export async function scheduleSession(id: string, scheduledAt: string): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Sessions")}/${id}/fields`, {
    [SESS_COL.scheduledAt]: scheduledAt,
    [SESS_COL.status]: "scheduled",
  });
}

export async function completeSession(
  sessionId: string,
  expertNotes: string,
  durationMinutes: number
): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Sessions")}/${sessionId}/fields`, {
    [SESS_COL.expertNotes]: expertNotes,
    [SESS_COL.durationMinutes]: durationMinutes,
    [SESS_COL.status]: "completed",
    [SESS_COL.completedAt]: new Date().toISOString(),
  });
}

// ============================================================
// Expert Payments
// ============================================================
export async function getExpertPayments(expertId?: string, partnerId?: string): Promise<ExpertPayment[]> {
  return [];
}

export async function approveExpertPayment(id: string, adminId: string): Promise<void> {
}

export async function markExpertPaymentPaid(id: string): Promise<void> {
}

export async function createExpertPayment(payment: Omit<ExpertPayment, "id">): Promise<ExpertPayment> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("ExpertPayments"), {
      fields: {
        ExpertId: payment.expertId,
        ExpertName: payment.expertName,
        SessionId: payment.sessionId,
        Amount: payment.amount,
        Status: payment.status,
        Currency: payment.currency,
        PaymentDate: payment.paidAt || null,
        CreatedAt: payment.createdAt,
      },
    });
    return { ...payment, id: String(res.id) } as ExpertPayment;
  } catch (err) {
    console.error("createExpertPayment live write failed:", err);
    return { ...payment, id: "failed" } as ExpertPayment;
  }
}

// ============================================================
// Notifications
// ============================================================
function mapNotif(itemId: string, f: Record<string, unknown>): AppNotification {
  return {
    id: String(f.Id || itemId),
    userId: String(f.UserId || ""),
    userType: (String(f.UserType || "customer")) as AppNotification["userType"],
    type: String(f.Type || "info") as AppNotification["type"],
    title: String(f.Title || ""),
    message: String(f.Message || ""),
    read: Boolean(f.Read),
    relatedId: f.RelatedId ? String(f.RelatedId) : undefined,
    createdAt: String(f.CreatedAt || new Date().toISOString()),
  };
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("AppNotifications")}?$expand=fields&$filter=fields/UserId eq '${escapeOData(userId)}'&$orderby=fields/CreatedAt desc&$top=200`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    return res.value.map((it) => mapNotif(it.id, it.fields));
  } catch (err) {
    console.error("getNotifications failed:", err);
    return [];
  }
}

export async function getNotificationById(id: string): Promise<AppNotification | null> {
  try {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("AppNotifications");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
      `${listUrl}?$expand=fields&$filter=fields/Id eq '${escapeOData(id)}'&$top=1`
    );
    const it = res.value[0];
    return it ? mapNotif(it.id, it.fields) : null;
  } catch (err) {
    console.error("getNotificationById failed:", err);
    return null;
  }
}

// ============================================================
// Activities (CRM Feed)
// ============================================================

export async function getActivities(partnerId?: string, clientId?: string): Promise<Activity[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("Activities")}?$expand=fields&$orderby=fields/${ACT_COL.createdAt} desc`;
    
    const filters: string[] = [];
    if (partnerId) filters.push(`fields/${ACT_COL.partnerId} eq '${partnerId}'`);
    if (clientId) filters.push(`fields/${ACT_COL.clientId} eq '${clientId}'`);
    
    if (filters.length > 0) {
      url += `&$filter=${filters.join(" and ")}`;
    }

    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        clientId: String(f[ACT_COL.clientId] || ""),
        partnerId: String(f[ACT_COL.partnerId] || ""),
        type: String(f[ACT_COL.type] || "email") as any,
        title: String(f[ACT_COL.title] || ""),
        description: String(f[ACT_COL.description] || ""),
        date: String(f[ACT_COL.date] || ""),
        createdBy: String(f[ACT_COL.createdBy] || ""),
        createdAt: String(f[ACT_COL.createdAt] || f[ACT_COL.date] || ""),
      } as Activity;
    });
  }, () => []);
}

export async function createActivity(data: Omit<Activity, "id">): Promise<Activity> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Activities"), {
    fields: {
      [ACT_COL.clientId]: data.clientId,
      [ACT_COL.partnerId]: data.partnerId,
      [ACT_COL.type]: data.type,
      [ACT_COL.title]: data.title,
      [ACT_COL.description]: data.description,
      [ACT_COL.date]: data.date,
      [ACT_COL.createdBy]: data.createdBy,
    }
  });
  return { ...data, id: String(res.id) };
}

async function findNotifSpItemId(notifId: string): Promise<{ listUrl: string; spItemId: string | null }> {
  const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const listUrl = await getSiteListUrlAsync("AppNotifications");
  const res = await graphGet<{ value: Array<{ id: string }> }>(
    `${listUrl}?$expand=fields&$filter=fields/Id eq '${escapeOData(notifId)}'&$top=1`
  );
  return { listUrl, spItemId: res.value[0]?.id ?? null };
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const { graphPatch } = await import("@/lib/graph");
    const { listUrl, spItemId } = await findNotifSpItemId(id);
    if (!spItemId) return;
    await graphPatch(`${listUrl}/${spItemId}/fields`, { Read: true });
  } catch (err) {
    console.error("markNotificationRead failed:", err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("AppNotifications");
    const res = await graphGet<{ value: Array<{ id: string }> }>(
      `${listUrl}?$expand=fields&$filter=fields/UserId eq '${escapeOData(userId)}' and fields/Read eq false&$top=200`
    );
    for (const it of res.value) {
      try {
        await graphPatch(`${listUrl}/${it.id}/fields`, { Read: true });
      } catch (err) {
        console.error("markAllNotificationsRead patch failed:", err);
      }
    }
  } catch (err) {
    console.error("markAllNotificationsRead failed:", err);
  }
}

export async function createNotification(notification: Omit<AppNotification, "id">): Promise<AppNotification> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("AppNotifications"), {
      fields: {
        UserId: notification.userId,
        UserType: notification.userType,
        Type: notification.type,
        Title: notification.title,
        Message: notification.message,
        Read: notification.read,
        RelatedId: notification.relatedId,
        CreatedAt: notification.createdAt,
      },
    });
    const newNotif = { ...notification, id: String(res.id) } as AppNotification;
    try {
      const { publish } = await import("@/lib/notifications-bus");
      publish(newNotif);
    } catch { /* ignore */ }
    return newNotif;
  } catch (err) {
    console.error("createNotification failed:", err);
    return { ...notification, id: "failed" } as AppNotification;
  }
}

/** Generate all session records for a newly purchased CustomerPackage. */
export async function generateSessionsForPackage(pkg: CustomerPackage): Promise<Session[]> {
  const sessions: Session[] = [];
  for (let i = 1; i <= pkg.totalSessions; i++) {
    const session: Session = {
      id: "pending",
      customerPackageId: pkg.id,
      customerId: pkg.customerId,
      customerName: pkg.customerName,
      expertId: pkg.expertId,
      expertName: pkg.expertName,
      partnerId: pkg.partnerId,
      sessionNumber: i,
      totalSessions: pkg.totalSessions,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
  }
  return sessions;
}

// ============================================================
// Sales Offers
// ============================================================

/** Generate next offer number: SO-YYYY-NNNNN */
export async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const offers = await getSalesOffers();
  const thisYear = offers.filter((o) => o.offerNumber.startsWith(`SO-${year}-`));
  const maxSeq = thisYear.reduce((max, o) => {
    const seq = parseInt(o.offerNumber.split("-")[2], 10);
    return seq > max ? seq : max;
  }, 0);
  return `SO-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
}

/** Generate next order number: SCCG-NNNNN */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const orders = await getSalesOrders();
  // Filter for both old ORD- and new SCCG- formats to find the real max
  const relevant = orders.filter((o) => o.orderNumber.includes("-"));
  const maxSeq = relevant.reduce((max, o) => {
    const parts = o.orderNumber.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    return !isNaN(seq) && seq > max ? seq : max;
  }, 0);
  return `SCCG-${String(maxSeq + 1).padStart(5, "0")}`;
}
/** Generate next invoice number: INV-YYYY-NNNNN */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const invoices = await getInvoices();
  return `INV-${year}-${String(invoices.length + 1).padStart(5, "0")}`;
}

export async function getSalesOffers(partnerId?: string): Promise<SalesOffer[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("SalesOffers")}?$expand=fields&$orderby=fields/Created desc`;
      if (partnerId && partnerId.trim() !== "") {
        url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      }
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(item.id), // Use top-level SharePoint ID, not f.id
          offerNumber: String(f[SO_COL.offerNumber] || ""), 
          partnerId: String(f[SO_COL.partnerId] || ""),
          partnerName: String(f[SO_COL.partnerName] || ""), 
          clientId: String(f[SO_COL.clientId] || ""),
          clientName: String(f[SO_COL.clientName] || ""), 
          clientEmail: String(f[SO_COL.clientEmail] || ""),
          status: String(f[SO_COL.status] || "draft") as SalesOffer["status"], 
          subtotal: Number(f[SO_COL.subtotal] || 0),
          discount: Number(f[SO_COL.discount] || 0), 
          discountType: String(f[SO_COL.discountType] || "fixed") as SalesOffer["discountType"],
          totalAmount: Number(f[SO_COL.totalAmount] || 0), 
          validUntil: String(f[SO_COL.validUntil] || new Date().toISOString()),
          notes: String(f[SO_COL.notes] || ""), 
          createdBy: String(f[SO_COL.createdBy] || ""),
          createdAt: String(f[SO_COL.createdAt] || new Date().toISOString()), 
          updatedAt: String(f[SO_COL.updatedAt] || new Date().toISOString()),
          sentAt: f[SO_COL.sentAt] ? String(f[SO_COL.sentAt]) : undefined,
          acceptedAt: f[SO_COL.acceptedAt] ? String(f[SO_COL.acceptedAt]) : undefined,
          rejectedAt: f[SO_COL.rejectedAt] ? String(f[SO_COL.rejectedAt]) : undefined,
          salesOrderId: f[SO_COL.salesOrderId] ? String(f[SO_COL.salesOrderId]) : undefined,
          saleType: f[SO_COL_EXT.saleType] ? String(f[SO_COL_EXT.saleType]) as SalesOffer["saleType"] : "direct",
          referralId: f[SO_COL_EXT.referralId] ? String(f[SO_COL_EXT.referralId]) : undefined,
          referralName: f[SO_COL_EXT.referralName] ? String(f[SO_COL_EXT.referralName]) : undefined,
          referralPercent: f[SO_COL_EXT.referralPercent] ? Number(f[SO_COL_EXT.referralPercent]) : undefined,
        } as SalesOffer;
      });
    }
  );
}

export async function getSalesOfferById(id: string): Promise<SalesOffer | null> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const url = `${await getSiteListUrlAsync("SalesOffers")}('${id}')?$expand=fields`;
    const res = await graphGet<{ id: string; fields: Record<string, unknown> }>(url);
    if (!res || !res.fields) return null;
    const f = res.fields;
    return {
      id: String(res.id), // Always use top-level id, not f.id
      offerNumber: String(f[SO_COL.offerNumber] || ""), 
      partnerId: String(f[SO_COL.partnerId] || ""),
      partnerName: String(f[SO_COL.partnerName] || ""), 
      clientId: String(f[SO_COL.clientId] || ""),
      clientName: String(f[SO_COL.clientName] || ""), 
      clientEmail: String(f[SO_COL.clientEmail] || ""),
      status: String(f[SO_COL.status] || "draft") as SalesOffer["status"], 
      subtotal: Number(f[SO_COL.subtotal] || 0),
      discount: Number(f[SO_COL.discount] || 0), 
      discountType: String(f[SO_COL.discountType] || "fixed") as SalesOffer["discountType"],
      totalAmount: Number(f[SO_COL.totalAmount] || 0), 
      validUntil: String(f[SO_COL.validUntil] || new Date().toISOString()),
      notes: String(f[SO_COL.notes] || ""), 
      createdBy: String(f[SO_COL.createdBy] || ""),
      createdAt: String(f[SO_COL.createdAt] || new Date().toISOString()), 
      updatedAt: String(f[SO_COL.updatedAt] || new Date().toISOString()),
      sentAt: f[SO_COL.sentAt] ? String(f[SO_COL.sentAt]) : undefined,
      acceptedAt: f[SO_COL.acceptedAt] ? String(f[SO_COL.acceptedAt]) : undefined,
      rejectedAt: f[SO_COL.rejectedAt] ? String(f[SO_COL.rejectedAt]) : undefined,
      salesOrderId: f[SO_COL.salesOrderId] ? String(f[SO_COL.salesOrderId]) : undefined,
    } as SalesOffer;
  } catch (err) {
    console.warn(`[getSalesOfferById] Error fetching id=${id}:`, err);
    return null;
  }
}

export async function createSalesOffer(offer: Omit<SalesOffer, "id">): Promise<SalesOffer> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string; fields: Record<string, any> }>(await getSiteListUrlAsync("SalesOffers"), {
    fields: {
      [SO_COL.offerNumber]: offer.offerNumber, 
      [SO_COL.partnerId]: offer.partnerId, 
      [SO_COL.partnerName]: offer.partnerName,
      [SO_COL.clientId]: offer.clientId, 
      [SO_COL.clientName]: offer.clientName, 
      [SO_COL.clientEmail]: offer.clientEmail,
      [SO_COL.status]: offer.status,
      [SO_COL_EXT.saleType]: offer.saleType,
      [SO_COL_EXT.referralId]: offer.referralId,
      [SO_COL_EXT.referralName]: offer.referralName,
      [SO_COL_EXT.referralPercent]: offer.referralPercent,
      [SO_COL.subtotal]: offer.subtotal, 
      [SO_COL.discount]: offer.discount,
      [SO_COL.discountType]: offer.discountType, 
      [SO_COL.totalAmount]: offer.totalAmount, 
      [SO_COL.validUntil]: offer.validUntil,
      [SO_COL.notes]: offer.notes, 
      [SO_COL.createdBy]: offer.createdBy,
      [SO_COL.createdAt]: offer.createdAt, 
      [SO_COL.updatedAt]: offer.updatedAt,
    }
  });
  return { ...offer, id: String(res.id) };
}


export async function getSalesOfferItems(offerId: string): Promise<SalesOfferItem[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("SalesOfferItems")}?$expand=fields&$filter=fields/${SOI_COL.salesOfferId} eq '${offerId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        salesOfferId: String(f[SOI_COL.salesOfferId] || ""),
        productId: String(f[SOI_COL.productId] || ""),
        productName: String(f[SOI_COL.productName] || ""),
        quantity: Number(f[SOI_COL.quantity] || 0),
        unitPrice: Number(f[SOI_COL.unitPrice] || 0),
        totalPrice: Number(f[SOI_COL.totalPrice] || 0),
      };
    });
  }, () => []);
}

export async function createSalesOfferItem(item: Omit<SalesOfferItem, "id">): Promise<SalesOfferItem> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("SalesOfferItems"), {
    fields: {
      [SOI_COL.salesOfferId]: item.salesOfferId,
      [SOI_COL.productId]: item.productId,
      [SOI_COL.productName]: item.productName,
      [SOI_COL.quantity]: item.quantity,
      [SOI_COL.unitPrice]: item.unitPrice,
      [SOI_COL.totalPrice]: item.totalPrice,
    }
  });
  return { ...item, id: String(res.id) };
}

export async function deleteSalesOfferItem(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("SalesOfferItems")}/${id}`);
}

export async function getSalesOrders(partnerId?: string): Promise<SalesOrder[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("SalesOrders")}?$expand=fields&$orderby=fields/CreatedAt desc`;
    if (partnerId) url += `&$filter=fields/${ORD_COL.partnerId} eq '${partnerId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        orderNumber: String(f[ORD_COL.orderNumber] || ""),
        salesOfferId: String(f[ORD_COL.salesOfferId] || ""),
        offerNumber: String(f[ORD_COL.offerNumber] || ""),
        partnerId: String(f[ORD_COL.partnerId] || ""),
        partnerName: String(f[ORD_COL.partnerName] || ""),
        clientId: String(f[ORD_COL.clientId] || ""),
        clientName: String(f[ORD_COL.clientName] || ""),
        clientEmail: String(f[ORD_COL.clientEmail] || ""),
        status: String(f[ORD_COL.status] || "pending") as any,
        totalAmount: Number(f[ORD_COL.totalAmount] || 0),
        notes: String(f[ORD_COL.notes] || ""),
        createdBy: String(f[ORD_COL.createdBy] || ""),
        createdAt: String(f[ORD_COL.createdAt] || ""),
        updatedAt: String(f[ORD_COL.updatedAt] || ""),
        completedAt: f[ORD_COL.completedAt] ? String(f[ORD_COL.completedAt]) : undefined,
      };
    });
  }, () => []);
}

export async function getSalesOrderById(id: string): Promise<SalesOrder | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const item = await graphGet<{ id: string; fields: Record<string, any> }>(`${await getSiteListUrlAsync("SalesOrders")}/${id}?$expand=fields`);
    const f = item.fields;
    return {
      id: String(item.id),
      orderNumber: String(f[ORD_COL.orderNumber] || ""),
      salesOfferId: String(f[ORD_COL.salesOfferId] || ""),
      offerNumber: String(f[ORD_COL.offerNumber] || ""),
      partnerId: String(f[ORD_COL.partnerId] || ""),
      partnerName: String(f[ORD_COL.partnerName] || ""),
      clientId: String(f[ORD_COL.clientId] || ""),
      clientName: String(f[ORD_COL.clientName] || ""),
      clientEmail: String(f[ORD_COL.clientEmail] || ""),
      status: String(f[ORD_COL.status] || "pending") as any,
      totalAmount: Number(f[ORD_COL.totalAmount] || 0),
      notes: String(f[ORD_COL.notes] || ""),
      createdBy: String(f[ORD_COL.createdBy] || ""),
      createdAt: String(f[ORD_COL.createdAt] || ""),
      updatedAt: String(f[ORD_COL.updatedAt] || ""),
      completedAt: f[ORD_COL.completedAt] ? String(f[ORD_COL.completedAt]) : undefined,
    };
  }, () => null);
}

export async function createSalesOrder(order: Omit<SalesOrder, "id">): Promise<SalesOrder> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("SalesOrders"), {
    fields: {
      [ORD_COL.orderNumber]: order.orderNumber,
      [ORD_COL.salesOfferId]: order.salesOfferId,
      [ORD_COL.offerNumber]: order.offerNumber,
      [ORD_COL.partnerId]: order.partnerId,
      [ORD_COL.partnerName]: order.partnerName,
      [ORD_COL.clientId]: order.clientId,
      [ORD_COL.clientName]: order.clientName,
      [ORD_COL.clientEmail]: order.clientEmail,
      [ORD_COL.status]: order.status,
      [ORD_COL.totalAmount]: order.totalAmount,
      [ORD_COL.notes]: order.notes,
      [ORD_COL.createdBy]: order.createdBy,
      [ORD_COL.createdAt]: order.createdAt,
      [ORD_COL.updatedAt]: order.updatedAt,
    }
  });
  return { ...order, id: String(res.id) };
}

export async function getSalesOrderItems(orderId: string): Promise<SalesOrderItem[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("SalesOrderItems")}?$expand=fields&$filter=fields/${ORDI_COL.salesOrderId} eq '${orderId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        salesOrderId: String(f[ORDI_COL.salesOrderId] || ""),
        productId: String(f[ORDI_COL.productId] || ""),
        productName: String(f[ORDI_COL.productName] || ""),
        quantity: Number(f[ORDI_COL.quantity] || 0),
        unitPrice: Number(f[ORDI_COL.unitPrice] || 0),
        totalPrice: Number(f[ORDI_COL.totalPrice] || 0),
      };
    });
  }, () => []);
}

export async function createSalesOrderItem(item: Omit<SalesOrderItem, "id">): Promise<SalesOrderItem> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("SalesOrderItems"), {
    fields: {
      [ORDI_COL.salesOrderId]: item.salesOrderId,
      [ORDI_COL.productId]: item.productId,
      [ORDI_COL.productName]: item.productName,
      [ORDI_COL.quantity]: item.quantity,
      [ORDI_COL.unitPrice]: item.unitPrice,
      [ORDI_COL.totalPrice]: item.totalPrice,
    }
  });
  return { ...item, id: String(res.id) };
}

export async function deleteSalesOrderItem(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("SalesOrderItems")}/${id}`);
}

export async function updateSalesOffer(id: string, data: Partial<SalesOffer>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, unknown> = { [SO_COL.updatedAt]: new Date().toISOString() };
  if (data.status) fields[SO_COL.status] = data.status;
  if (data.notes !== undefined) fields[SO_COL.notes] = data.notes;
  if (data.sentAt) fields[SO_COL.sentAt] = data.sentAt;
  if (data.acceptedAt) fields[SO_COL.acceptedAt] = data.acceptedAt;
  if (data.rejectedAt) fields[SO_COL.rejectedAt] = data.rejectedAt;
  if (data.salesOrderId) fields[SO_COL.salesOrderId] = data.salesOrderId;
  if (data.totalAmount !== undefined) fields[SO_COL.totalAmount] = data.totalAmount;
  if (data.subtotal !== undefined) fields[SO_COL.subtotal] = data.subtotal;
  if (data.discount !== undefined) fields[SO_COL.discount] = data.discount;
  if (data.discountType) fields[SO_COL.discountType] = data.discountType;
  if (data.validUntil) fields[SO_COL.validUntil] = data.validUntil;
  if (data.saleType) fields[SO_COL_EXT.saleType] = data.saleType;
  if (data.referralId !== undefined) fields[SO_COL_EXT.referralId] = data.referralId;
  if (data.referralName !== undefined) fields[SO_COL_EXT.referralName] = data.referralName;
  if (data.referralPercent !== undefined) fields[SO_COL_EXT.referralPercent] = data.referralPercent;
  await graphPatch(`${await getSiteListUrlAsync("SalesOffers")}/${id}/fields`, fields);
}

export async function updateSalesOrder(id: string, data: Partial<SalesOrder>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, unknown> = { [ORD_COL.updatedAt]: new Date().toISOString() };
  if (data.status) fields[ORD_COL.status] = data.status;
  if (data.notes !== undefined) fields[ORD_COL.notes] = data.notes;
  if (data.completedAt) fields[ORD_COL.completedAt] = data.completedAt;
  await graphPatch(`${await getSiteListUrlAsync("SalesOrders")}/${id}/fields`, fields);
}

export async function deleteSalesOffer(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  // Delete items first
  const items = await getSalesOfferItems(id);
  for (const item of items) {
    await graphDelete(`${await getSiteListUrlAsync("SalesOfferItems")}/${item.id}`);
  }
  await graphDelete(`${await getSiteListUrlAsync("SalesOffers")}/${id}`);
}

export async function getServiceTasks(orderId?: string): Promise<ServiceTask[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("ServiceTasks")}?$expand=fields&$orderby=fields/${ST_COL.createdAt} desc`;
    if (orderId) url += `&$filter=fields/${ST_COL.salesOrderId} eq '${orderId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        salesOrderId: String(f[ST_COL.salesOrderId] || ""),
        orderNumber: String(f[ST_COL.orderNumber] || ""),
        title: String(f[ST_COL.title] || ""),
        description: String(f[ST_COL.description] || ""),
        status: String(f[ST_COL.status] || "pending") as any,
        priority: String(f[ST_COL.priority] || "medium") as any,
        assignedTo: String(f[ST_COL.assignedTo] || ""),
        dueDate: f[ST_COL.dueDate] ? String(f[ST_COL.dueDate]) : undefined,
        createdAt: String(f[ST_COL.createdAt] || ""),
        updatedAt: String(f[ST_COL.updatedAt] || ""),
      };
    });
  }, () => []);
}

export async function createServiceTask(task: Omit<ServiceTask, "id">): Promise<ServiceTask> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("ServiceTasks"), {
    fields: {
      [ST_COL.salesOrderId]: task.salesOrderId, 
      [ST_COL.orderNumber]: task.orderNumber,
      [ST_COL.title]: task.title, 
      [ST_COL.description]: task.description,
      [ST_COL.assignedTo]: task.assignedTo, 
      [ST_COL.status]: task.status,
      [ST_COL.dueDate]: task.dueDate, 
      [ST_COL.createdAt]: task.createdAt,
    },
  });
  return task as ServiceTask;
}

export async function updateServiceTask(id: string, data: Partial<ServiceTask>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, unknown> = {};
  if (data.status) fields[ST_COL.status] = data.status;
  if (data.assignedTo !== undefined) fields[ST_COL.assignedTo] = data.assignedTo;
  if (data.completedAt) fields[ST_COL.completedAt] = data.completedAt;
  if (data.title) fields[ST_COL.title] = data.title;
  if (data.description !== undefined) fields[ST_COL.description] = data.description;
  if (data.dueDate) fields[ST_COL.dueDate] = data.dueDate;
  await graphPatch(`${await getSiteListUrlAsync("ServiceTasks")}/${id}/fields`, fields);
}

/**
 * Convert an accepted Sales Offer into a Sales Order.
 * - Creates a new SalesOrder with a unique order number.
 * - Copies all SalesOfferItems to SalesOrderItems.
 * - Copies promo/commission/coin/giftcard fields from offer.
 * - Updates the SalesOffer with the new salesOrderId.
 * - On any failure after order creation, attempts compensating delete.
 */
export async function convertOfferToOrder(offerId: string): Promise<SalesOrder> {
  const offer = await getSalesOfferById(offerId);
  if (!offer) throw new Error("Sales Offer not found");
  if (offer.status !== "accepted") throw new Error("Only accepted offers can be converted");
  if (offer.salesOrderId) throw new Error("Offer already converted to order");

  const orderNumber = await generateOrderNumber();
  const now = new Date().toISOString();

  const newOrder = await createSalesOrder({
    orderNumber,
    salesOfferId: offer.id,
    offerNumber: offer.offerNumber,
    partnerId: offer.partnerId,
    partnerName: offer.partnerName,
    clientId: offer.clientId,
    clientName: offer.clientName,
    clientEmail: offer.clientEmail,
    status: "pending",
    totalAmount: offer.totalAmount,
    notes: `Converted from offer ${offer.offerNumber}`,
    createdBy: offer.createdBy,
    createdAt: now,
    updatedAt: now,
    // Copy commission/promo/coin/giftcard fields so commission engine can settle later
    promoCodeId: offer.promoCodeId,
    promoCodeValue: offer.promoCodeValue,
    promoDiscountAmount: offer.promoDiscountAmount,
    attributedPartnerId: offer.attributedPartnerId,
    attributedPartnerType: offer.attributedPartnerType,
    commissionRuleId: offer.commissionRuleId,
    commissionPercent: offer.commissionPercent,
    commissionAmount: offer.commissionAmount,
    commissionStatus: offer.commissionAmount ? "pending" : undefined,
    sccgCoinUsed: offer.sccgCoinUsed,
    giftCardId: offer.giftCardId,
    giftCardAmountUsed: offer.giftCardAmountUsed,
  });

  // Copy items — best-effort; if any fail, attempt rollback of the order.
  try {
    const offerItems = await getSalesOfferItems(offerId);
    for (const item of offerItems) {
      await createSalesOrderItem({
        salesOrderId: newOrder.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }
  } catch (e) {
    // Compensating delete to keep state consistent
    try {
      const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
      await graphDelete(`${await getSiteListUrlAsync("SalesOrders")}('${newOrder.id}')`);
    } catch (rollbackErr) {
      console.error("Order rollback failed:", (rollbackErr as Error).message);
    }
    throw new Error(`Failed to copy offer items: ${(e as Error).message}`);
  }

  // Update offer with order reference
  await updateSalesOffer(offerId, { salesOrderId: newOrder.id });

  // Run commission engine: build pending Referral + Payout records.
  // Failures here are logged but do not block order creation.
  try {
    const { buildPayoutRecords, buildReferralRecord } = await import("@/lib/payouts");
    const referralRec = buildReferralRecord(offer);
    if (referralRec) {
      try {
        await createReferral({ ...referralRec, salesOrderId: newOrder.id });
      } catch (err) {
        console.error("createReferral failed (non-fatal):", err);
      }
    }
    const payouts = buildPayoutRecords(newOrder, offer, false);
    for (const p of payouts) {
      try {
        await createPayout(p);
      } catch (err) {
        console.error("createPayout failed (non-fatal):", err);
      }
    }
  } catch (err) {
    console.error("Commission engine failed (non-fatal):", err);
  }

  return newOrder;
}

// ============================================================
// Promotions
// ============================================================
export async function getPromotions(): Promise<Promotion[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
        `${await getSiteListUrlAsync("Promotions")}?$expand=fields&$orderby=fields/${PROMO_COL.priority} asc`
      );
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: item.id,
          title: String(f[PROMO_COL.title] || ""),
          description: f[PROMO_COL.description] ? String(f[PROMO_COL.description]) : undefined,
          type: String(f[PROMO_COL.type] || "promo") as Promotion["type"],
          appliesTo: String(f[PROMO_COL.appliesTo] || "all") as Promotion["appliesTo"],
          productId: f[PROMO_COL.productId] ? String(f[PROMO_COL.productId]) : undefined,
          category: f[PROMO_COL.category] ? String(f[PROMO_COL.category]) : undefined,
          discountType: String(f[PROMO_COL.discountType] || "percent") as "fixed" | "percent",
          discountValue: Number(f[PROMO_COL.discountValue] || 0),
          startDate: String(f[PROMO_COL.startDate] || new Date().toISOString()),
          endDate: f[PROMO_COL.endDate] ? String(f[PROMO_COL.endDate]) : undefined,
          isActive: Boolean(f[PROMO_COL.isActive]),
          imageUrl: f[PROMO_COL.imageUrl] ? String(f[PROMO_COL.imageUrl]) : undefined,
          priority: Number(f[PROMO_COL.priority] || 99),
        } as Promotion;
      });
    }
  );
}

export async function createPromotion(data: Omit<Promotion, "id">): Promise<Promotion> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Promotions"), {
      fields: {
        [PROMO_COL.title]: data.title,
        [PROMO_COL.description]: data.description,
        [PROMO_COL.type]: data.type,
        [PROMO_COL.appliesTo]: data.appliesTo,
        [PROMO_COL.productId]: data.productId,
        [PROMO_COL.category]: data.category,
        [PROMO_COL.discountType]: data.discountType,
        [PROMO_COL.discountValue]: data.discountValue,
        [PROMO_COL.startDate]: data.startDate,
        [PROMO_COL.endDate]: data.endDate,
        [PROMO_COL.isActive]: data.isActive,
        [PROMO_COL.imageUrl]: data.imageUrl,
        [PROMO_COL.priority]: data.priority,
      },
    });
    return { ...data, id: String(res.id) } as Promotion;
  } catch (err) {
    console.error("createPromotion failed:", err);
    return { ...data, id: "failed" } as Promotion;
  }
}

export async function updatePromotion(id: string, data: Partial<Promotion>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Promotions")}/${id}/fields`, data);
}

export async function deletePromotion(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Promotions")}/${id}`);
}

// ============================================================
// Referrals
// ============================================================
export async function getReferrals(partnerId?: string): Promise<Referral[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const filter = partnerId
    ? `?$filter=fields/${REF_COL.referrerId} eq '${partnerId}'&$expand=fields`
    : `?$expand=fields`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
    `${await getSiteListUrlAsync("Referrals")}${filter}`
  );
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: item.id,
      referrerId: String(f[REF_COL.referrerId] || ""),
      referrerName: String(f[REF_COL.referrerName] || ""),
      referrerType: String(f[REF_COL.referrerType] || "partner") as Referral["referrerType"],
      salesOfferId: String(f[REF_COL.salesOfferId] || ""),
      salesOrderId: f[REF_COL.salesOrderId] ? String(f[REF_COL.salesOrderId]) : undefined,
      percentage: Number(f[REF_COL.percentage] || 0),
      amount: Number(f[REF_COL.amount] || 0),
      status: String(f[REF_COL.status] || "pending") as Referral["status"],
      createdAt: String(f[REF_COL.createdAt] || new Date().toISOString()),
    } as Referral;
  });
}

export async function createReferral(data: Omit<Referral, "id">): Promise<Referral> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
    [REF_COL.referrerId]: data.referrerId,
    [REF_COL.referrerName]: data.referrerName,
    [REF_COL.referrerType]: data.referrerType,
    [REF_COL.salesOfferId]: data.salesOfferId,
    [REF_COL.percentage]: data.percentage,
    [REF_COL.amount]: data.amount,
    [REF_COL.status]: data.status,
    [REF_COL.createdAt]: data.createdAt,
  };
  const res = await graphPost<{ id: string }>(`${await getSiteListUrlAsync("Referrals")}`, { fields: body });
  return { ...data, id: res.id };
}

export async function updateReferral(id: string, data: Partial<Referral>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Referrals")}/${id}/fields`, data);
}

// ============================================================
// Payouts
// ============================================================
export async function getPayouts(recipientId?: string): Promise<Payout[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const filter = recipientId
    ? `?$filter=fields/${PAY_COL.recipientId} eq '${recipientId}'&$expand=fields`
    : `?$expand=fields`;
  const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
    `${await getSiteListUrlAsync("Payouts")}${filter}`
  );
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: item.id,
      recipientId: String(f[PAY_COL.recipientId] || ""),
      recipientName: String(f[PAY_COL.recipientName] || ""),
      recipientType: String(f[PAY_COL.recipientType] || "partner") as Payout["recipientType"],
      relatedOrderId: String(f[PAY_COL.relatedOrderId] || ""),
      relatedOrderNumber: f[PAY_COL.relatedOrderNumber] ? String(f[PAY_COL.relatedOrderNumber]) : undefined,
      gross: Number(f[PAY_COL.gross] || 0),
      deductions: Number(f[PAY_COL.deductions] || 0),
      net: Number(f[PAY_COL.net] || 0),
      currency: String(f[PAY_COL.currency] || "BDT") as "BDT" | "EUR",
      status: String(f[PAY_COL.status] || "pending") as Payout["status"],
      payoutDate: f[PAY_COL.payoutDate] ? String(f[PAY_COL.payoutDate]) : undefined,
      notes: f[PAY_COL.notes] ? String(f[PAY_COL.notes]) : undefined,
      createdAt: String(f[PAY_COL.createdAt] || new Date().toISOString()),
    } as Payout;
  });
}

export async function createPayout(data: Omit<Payout, "id">): Promise<Payout> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
    [PAY_COL.recipientId]: data.recipientId,
    [PAY_COL.recipientName]: data.recipientName,
    [PAY_COL.recipientType]: data.recipientType,
    [PAY_COL.relatedOrderId]: data.relatedOrderId,
    [PAY_COL.relatedOrderNumber]: data.relatedOrderNumber,
    [PAY_COL.gross]: data.gross,
    [PAY_COL.deductions]: data.deductions,
    [PAY_COL.net]: data.net,
    [PAY_COL.currency]: data.currency,
    [PAY_COL.status]: data.status,
    [PAY_COL.createdAt]: data.createdAt,
  };
  const res = await graphPost<{ id: string }>(`${await getSiteListUrlAsync("Payouts")}`, { fields: body });
  return { ...data, id: res.id };
}

export async function updatePayoutStatus(
  id: string,
  status: Payout["status"],
  payoutDate?: string
): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Payouts")}/${id}/fields`, {
    [PAY_COL.status]: status,
    [PAY_COL.payoutDate]: payoutDate,
  });
}

// ============================================================
// RowActions helpers (delete / hold)
// ============================================================

export async function deletePartner(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Partners")}/${id}`);
}

export async function togglePartnerHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Partners")}/${id}/fields`, { isOnHold: hold });
}

export async function deletePayout(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Payouts")}/${id}`);
}

export async function togglePayoutHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Payouts")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteReferral(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Referrals")}/${id}`);
}

export async function toggleReferralHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Referrals")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteExpertPayment(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("ExpertPayments")}/${id}`);
}

export async function toggleExpertPaymentHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("ExpertPayments")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteExpense(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Expenses")}/${id}`);
}

export async function toggleExpenseHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Expenses")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteInvoice(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Invoices")}/${id}`);
}

export async function toggleInvoiceHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Invoices")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteCustomer(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Customers")}/${id}`);
}

export async function toggleCustomerHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Customers")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteSession(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Sessions")}/${id}`);
}

export async function toggleSessionHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Sessions")}/${id}/fields`, { isOnHold: hold });
}

export async function deleteSalesOrderRecord(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("SalesOrders")}/${id}`);
}

export async function toggleSalesOrderHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("SalesOrders")}/${id}/fields`, { isOnHold: hold });
}

// Suppress unused variable warning for extended column map
void SO_COL_EXT;

// ============================================================
// Email Tracking
// ============================================================

export async function createEmailTracking(data: Omit<EmailTracking, "id">): Promise<EmailTracking> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("EmailTracking"), {
      fields: {
        SalesOfferId: data.salesOfferId,
        OfferNumber: data.offerNumber,
        RecipientEmail: data.recipientEmail,
        RecipientName: data.recipientName,
        SenderName: data.senderName,
        Subject: data.subject,
        Status: data.status,
        SentAt: data.sentAt,
        OpenedAt: data.openedAt,
        AcceptToken: data.acceptToken,
        CreatedAt: data.createdAt,
      },
    });
    return { ...data, id: String(res.id) } as EmailTracking;
  } catch (err) {
    console.error("createEmailTracking failed:", err);
    return { ...data, id: "failed" } as EmailTracking;
  }
}

export async function getEmailTrackingByOffer(salesOfferId: string): Promise<EmailTracking[]> {
  try {
    const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("EmailTracking")}?$expand=fields&$filter=fields/SalesOfferId eq '${escapeOData(salesOfferId)}'`;
    const res = await graphGetSafe<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    if (!res?.value) return [];
    return res.value.map((it) => mapEmailTracking(it.id, it.fields));
  } catch {
    return [];
  }
}

export async function getEmailTrackingByToken(acceptToken: string): Promise<EmailTracking | null> {
  try {
    const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("EmailTracking")}?$expand=fields&$filter=fields/AcceptToken eq '${escapeOData(acceptToken)}'&$top=1`;
    const res = await graphGetSafe<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    if (!res?.value?.length) return null;
    return mapEmailTracking(res.value[0].id, res.value[0].fields);
  } catch {
    return null;
  }
}

export async function updateEmailTracking(id: string, data: Partial<EmailTracking>): Promise<void> {
  try {
    const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const fields: Record<string, unknown> = {};
    if (data.status) fields.Status = data.status;
    if (data.openedAt) fields.OpenedAt = data.openedAt;
    if (data.sentAt) fields.SentAt = data.sentAt;
    if (Object.keys(fields).length === 0) return;
    await graphPatch(`${await getSiteListUrlAsync("EmailTracking")}/${id}/fields`, fields);
  } catch (e) {
    console.error("updateEmailTracking failed:", (e as Error).message);
  }
}

function mapEmailTracking(id: string, f: Record<string, unknown>): EmailTracking {
  return {
    id: String(id),
    salesOfferId: f.SalesOfferId ? String(f.SalesOfferId) : undefined,
    offerNumber: f.OfferNumber ? String(f.OfferNumber) : undefined,
    recipientEmail: String(f.RecipientEmail || ""),
    recipientName: f.RecipientName ? String(f.RecipientName) : undefined,
    senderName: f.SenderName ? String(f.SenderName) : undefined,
    subject: String(f.Subject || ""),
    status: String(f.Status || "queued") as EmailTracking["status"],
    sentAt: String(f.SentAt || ""),
    openedAt: f.OpenedAt ? String(f.OpenedAt) : undefined,
    acceptToken: f.AcceptToken ? String(f.AcceptToken) : undefined,
    createdAt: String(f.CreatedAt || f.SentAt || new Date().toISOString()),
  };
}

// ============================================================
// Coin Wallets & Transactions
// ============================================================

export async function getAllCoinWallets(): Promise<CoinWallet[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(
      `${await getSiteListUrlAsync("CoinWallets")}?$expand=fields`
    );
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        userId: String(f[CW_COL.userId] || ""),
        userName: String(f[CW_COL.userName] || ""),
        userEmail: String(f[CW_COL.userEmail] || ""),
        balance: Number(f[CW_COL.balance] || 0),
        totalEarned: Number(f[CW_COL.totalEarned] || 0),
        totalSpent: Number(f[CW_COL.totalSpent] || 0),
        currency: String(f[CW_COL.currency] || "SCCG"),
        status: String(f[CW_COL.status] || "active"),
        createdAt: String(f[CW_COL.createdAt] || ""),
        updatedAt: String(f[CW_COL.updatedAt] || ""),
      } as CoinWallet;
    });
  }, () => []);
}

export async function getCoinWallet(userId: string): Promise<CoinWallet | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("CoinWallets");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(
      `${listUrl}?$expand=fields&$filter=fields/${CW_COL.userId} eq '${escapeOData(userId)}'&$top=1`
    );
    if (!res.value.length) return null;
    const item = res.value[0];
    const f = item.fields;
    return {
      id: String(item.id),
      userId: String(f[CW_COL.userId] || ""),
      userName: String(f[CW_COL.userName] || ""),
      userEmail: String(f[CW_COL.userEmail] || ""),
      balance: Number(f[CW_COL.balance] || 0),
      totalEarned: Number(f[CW_COL.totalEarned] || 0),
      totalSpent: Number(f[CW_COL.totalSpent] || 0),
      currency: String(f[CW_COL.currency] || "SCCG"),
      status: String(f[CW_COL.status] || "active"),
      createdAt: String(f[CW_COL.createdAt] || ""),
      updatedAt: String(f[CW_COL.updatedAt] || ""),
    } as CoinWallet;
  }, () => null);
}

export async function createCoinWallet(data: Omit<CoinWallet, "id">): Promise<CoinWallet> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("CoinWallets"), {
    fields: {
      [CW_COL.userId]: data.userId,
      [CW_COL.userName]: data.userName ?? "",
      [CW_COL.userEmail]: data.userEmail,
      [CW_COL.balance]: data.balance,
      [CW_COL.totalEarned]: data.totalEarned ?? 0,
      [CW_COL.totalSpent]: data.totalSpent ?? 0,
      [CW_COL.currency]: data.currency,
      [CW_COL.status]: data.status,
      [CW_COL.createdAt]: data.createdAt ?? new Date().toISOString(),
      [CW_COL.updatedAt]: data.updatedAt ?? new Date().toISOString(),
    }
  });
  return { ...data, id: String(res.id) };
}

export async function updateCoinWallet(userId: string, data: Partial<CoinWallet>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const wallet = await getCoinWallet(userId);
  if (!wallet) throw new Error("Wallet not found for user: " + userId);
  
  const body: Record<string, any> = {};
  if (data.balance !== undefined) body[CW_COL.balance] = data.balance;
  if (data.status) body[CW_COL.status] = data.status;
  body[CW_COL.updatedAt] = new Date().toISOString();

  await graphPatch(`${await getSiteListUrlAsync("CoinWallets")}/${wallet.id}/fields`, body);
}

export async function updateWalletBalance(id: string, newBalance: number): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("CoinWallets")}/${id}/fields`, {
    [CW_COL.balance]: newBalance,
    [CW_COL.updatedAt]: new Date().toISOString(),
  });
}

export async function getWalletTransactions(userId: string): Promise<CoinTransaction[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("CoinTransactions")}?$expand=fields&$filter=fields/${CT_COL.userId} eq '${escapeOData(userId)}'&$orderby=fields/${CT_COL.date} desc`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
          id: String(item.id),
          walletId: String(f[CT_COL.walletId] || ""),
          userId: String(f[CT_COL.userId] || ""),
          transactionType: String(f[CT_COL.type] || "earn") as any,
          amount: Number(f[CT_COL.amount] || 0),
          runningBalance: Number(f[CT_COL.balanceAfter] || 0),
          description: String(f[CT_COL.description] || ""),
          referenceId: String(f[CT_COL.reference] || ""),
          createdAt: String(f[CT_COL.date] || ""),
          createdBy: String(f[CT_COL.createdBy] || "system"),
        } as CoinTransaction;
      });
    }, () => []);
  }
  
  export async function createCoinTransaction(tx: Omit<CoinTransaction, "id">): Promise<CoinTransaction> {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("CoinTransactions"), {
      fields: {
        [CT_COL.walletId]: tx.walletId,
        [CT_COL.userId]: tx.userId,
        [CT_COL.type]: tx.transactionType,
        [CT_COL.amount]: tx.amount,
        [CT_COL.balanceAfter]: tx.runningBalance,
        [CT_COL.description]: tx.description,
        [CT_COL.reference]: tx.referenceId || "",
        [CT_COL.date]: tx.createdAt,
        [CT_COL.createdBy]: tx.createdBy,
      }
    });
    return { ...tx, id: String(res.id) } as CoinTransaction;
}

// ============================================================
// User Profiles & Identity
// ============================================================


export async function updateUserProfile(email: string, data: Partial<any>): Promise<void> {
  const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const listUrl = await getSiteListUrlAsync("UserProfiles");
  const lookup = await graphGet<{ value: Array<{ id: string }> }>(
    `${listUrl}?$expand=fields&$filter=fields/${UP_COL.email} eq '${escapeOData(email)}'&$top=1`
  );
  const spItemId = lookup.value[0]?.id;
  if (!spItemId) return;

  const fields: Record<string, any> = { [UP_COL.updatedAt]: new Date().toISOString() };
  if (data.displayName) fields[UP_COL.displayName] = data.displayName;
  if (data.phone) fields[UP_COL.phone] = data.phone;
  if (data.company) fields[UP_COL.company] = data.company;
  if (data.specialization) fields[UP_COL.specialization] = data.specialization;
  if (data.status) fields[UP_COL.status] = data.status;

  await graphPatch(`${listUrl}/${spItemId}/fields`, fields);
}

export async function deleteUser(email: string): Promise<void> {
  // Mark profile as inactive and revoke all roles
  await updateUserProfile(email, { status: "inactive" });
  
  const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const rolesUrl = await getSiteListUrlAsync("UserRoles");
  const roles = await graphGet<{ value: Array<{ id: string }> }>(
    `${rolesUrl}?$expand=fields&$filter=fields/${UR_COL.userAccountId} eq '${escapeOData(email)}' and fields/${UR_COL.status} eq 'active'`
  );

  const revokedAt = new Date().toISOString();
  for (const role of roles.value) {
    await graphPatch(`${rolesUrl}/${role.id}/fields`, {
      [UR_COL.status]: "revoked",
      [UR_COL.revokedAt]: revokedAt,
    });
  }
}

// ============================================================
// Offer Acceptance Logs
// ============================================================

export async function createOfferAcceptanceLog(data: Omit<OfferAcceptanceLog, "id">): Promise<OfferAcceptanceLog> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("OfferAcceptanceLog"), {
      fields: {
        SalesOfferId: data.salesOfferId,
        OfferNumber: data.offerNumber,
        AcceptToken: data.acceptToken,
        ClientEmail: data.clientEmail,
        Action: data.action,
        IpAddress: data.ipAddress,
        UserAgent: data.userAgent,
        Timestamp: data.timestamp,
      },
    });
    return { ...data, id: String(res.id) };
  } catch (e) {
    console.error("createOfferAcceptanceLog failed:", (e as Error).message);
    return { ...data, id: "failed" };
  }
}

export async function getOfferAcceptanceLogs(salesOfferId: string): Promise<OfferAcceptanceLog[]> {
  try {
    const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("OfferAcceptanceLog")}?$expand=fields&$filter=fields/SalesOfferId eq '${escapeOData(salesOfferId)}'`;
    const res = await graphGetSafe<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    if (!res?.value) return [];
    return res.value.map((it) => ({
      id: String(it.id),
      salesOfferId: String(it.fields.SalesOfferId || ""),
      offerNumber: String(it.fields.OfferNumber || ""),
      acceptToken: String(it.fields.AcceptToken || ""),
      clientEmail: String(it.fields.ClientEmail || ""),
      action: String(it.fields.Action || "viewed") as OfferAcceptanceLog["action"],
      ipAddress: it.fields.IpAddress ? String(it.fields.IpAddress) : undefined,
      userAgent: it.fields.UserAgent ? String(it.fields.UserAgent) : undefined,
      timestamp: String(it.fields.Timestamp || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Kanban Tasks
// ============================================================

export async function getKanbanTasks(userId?: string): Promise<KanbanTask[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    // IMPORTANT: Some live tenants have KanbanTasks without a custom `CreatedAt` field populated.
    // Ordering by a missing field causes Graph to error ("cannot be referenced in filter or orderby"),
    // which previously made the whole board appear empty.
    // Use the built-in ListItem timestamp instead.
    let url = `${await getSiteListUrlAsync("KanbanTasks")}?$expand=fields&$orderby=createdDateTime desc`;
    if (userId) {
      url += `&$filter=fields/${KT_COL.assignedTo} eq '${escapeOData(userId)}'`;
    }
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any>; createdDateTime?: string; lastModifiedDateTime?: string }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      const rawTags = f[KT_COL.tags];
      const tags = (() => {
        if (!rawTags) return [];
        const s = String(rawTags);
        // Support either JSON array string or comma-separated string.
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch {}
        return s.split(",").map((t) => t.trim()).filter(Boolean);
      })();
      return {
        id: String(item.id),
        title: String(f[KT_COL.title] || ""),
        description: String(f[KT_COL.description] || ""),
        status: String(f[KT_COL.status] || "todo") as any,
        priority: String(f[KT_COL.priority] || "medium") as any,
        dueDate: f[KT_COL.dueDate] ? String(f[KT_COL.dueDate]) : undefined,
        assignedTo: f[KT_COL.assignedTo] ? String(f[KT_COL.assignedTo]) : undefined,
        assignedToName: f[KT_COL.assignedToName] ? String(f[KT_COL.assignedToName]) : undefined,
        assignedToEmail: f[KT_COL.assignedToEmail] ? String(f[KT_COL.assignedToEmail]) : undefined,
        tags,
        comments: f[KT_COL.comments] ? JSON.parse(String(f[KT_COL.comments])) : [],
        createdBy: String(f[KT_COL.createdBy] || ""),
        createdAt: String(f[KT_COL.createdAt] || item.createdDateTime || ""),
        updatedAt: String(f[KT_COL.updatedAt] || item.lastModifiedDateTime || ""),
      };
    });
  }, () => []);
}

export async function updateKanbanTask(id: string, data: Partial<KanbanTask>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, any> = {};
  if (data.title) fields[KT_COL.title] = data.title;
  if (data.description) fields[KT_COL.description] = data.description;
  if (data.status) fields[KT_COL.status] = data.status;
  if (data.priority) fields[KT_COL.priority] = data.priority;
  if (data.dueDate) fields[KT_COL.dueDate] = data.dueDate;
  if (data.assignedTo) fields[KT_COL.assignedTo] = data.assignedTo;
  if (data.tags) fields[KT_COL.tags] = JSON.stringify(data.tags);
  fields[KT_COL.updatedAt] = new Date().toISOString();

  await graphPatch(`${await getSiteListUrlAsync("KanbanTasks")}/${id}/fields`, fields);
}

export async function deleteKanbanTask(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("KanbanTasks")}/${id}`);
}

export async function getPromoCodes(ownerId?: string): Promise<PromoCode[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("PromoCodes")}?$expand=fields`;
    if (ownerId) url += `&$filter=fields/OwnerId eq '${ownerId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        code: String(f.Code || ""),
        codeType: String(f.Type || "referral") as any,
        ownerId: String(f.OwnerId || ""),
        ownerName: String(f.OwnerName || ""),
        discountType: String(f.DiscountType || "percent") as any,
        discountValue: Number(f.Value || 0),
        maxUses: Number(f.MaxUsages || 0),
        currentUses: Number(f.CurrentUsages || 0),
        maxUsesPerUser: 1,
        minOrderAmount: 0,
        validFrom: String(f.CreatedAt || ""),
        status: Boolean(f.IsActive) ? "active" : "revoked",
        shareableLink: "",
        createdAt: String(f.CreatedAt || ""),
        createdBy: "system",
      } as PromoCode;
    });
  }, () => []);
}

export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("PromoCodes")}?$expand=fields&$filter=fields/Code eq '${escapeOData(code)}' and fields/IsActive eq true`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    if (!res.value.length) return null;
    const f = res.value[0].fields;
    return {
      id: String(res.value[0].id),
      code: String(f.Code || ""),
      codeType: String(f.Type || "referral") as any,
      ownerId: String(f.OwnerId || ""),
      ownerName: String(f.OwnerName || ""),
      discountType: String(f.DiscountType || "percent") as any,
      discountValue: Number(f.Value || 0),
      maxUses: Number(f.MaxUsages || 0),
      currentUses: Number(f.CurrentUsages || 0),
      maxUsesPerUser: 1,
      minOrderAmount: 0,
      validFrom: String(f.CreatedAt || ""),
      status: Boolean(f.IsActive) ? "active" : "revoked",
      shareableLink: "",
      createdAt: String(f.CreatedAt || ""),
      createdBy: "system",
    } as PromoCode;
  }, () => null);
}

export async function createPromoCode(data: Omit<PromoCode, "id">): Promise<PromoCode> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("PromoCodes"), {
      fields: {
        Code: data.code,
        Type: data.codeType,
        Value: data.discountValue,
        DiscountType: data.discountType,
        OwnerId: data.ownerId,
        OwnerName: data.ownerName,
        IsActive: data.status === "active",
        MaxUsages: data.maxUses,
        CurrentUsages: data.currentUses,
        CreatedAt: data.createdAt,
      },
    });
    return { ...data, id: String(res.id) } as PromoCode;
  } catch (err) {
    console.error("createPromoCode failed:", err);
    return { ...data, id: "failed" } as PromoCode;
  }
}

export async function updatePromoCode(id: string, data: Partial<PromoCode>): Promise<void> {
}

export async function deletePromoCode(id: string): Promise<void> {
}

export async function getPromoCodeUsages(promoCodeId?: string): Promise<PromoCodeUsage[]> {
  return [];
}

export async function createPromoCodeUsage(data: Omit<PromoCodeUsage, "id">): Promise<PromoCodeUsage> {
  return { ...data, id: "pending" } as PromoCodeUsage;
}

// ============================================================
// Commission Rules
// ============================================================

export async function getCommissionRules(): Promise<CommissionRule[]> {
  return [];
}

export async function getCommissionRuleById(id: string): Promise<CommissionRule | null> {
  return null;
}

export async function createCommissionRule(data: Omit<CommissionRule, "id">): Promise<CommissionRule> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("CommissionRules"), {
      fields: {
        Title: data.name,
        Role: data.partnerTier,
        Percentage: data.commissionPercent,
        IsActive: data.isActive,
      },
    });
    return { ...data, id: String(res.id) } as CommissionRule;
  } catch (err) {
    console.error("createCommissionRule failed:", err);
    return { ...data, id: "failed" } as CommissionRule;
  }
}

export async function updateCommissionRule(id: string, data: Partial<CommissionRule>): Promise<void> {
}

export async function deleteCommissionRule(id: string): Promise<void> {
}

// ============================================================
// Commission Ledger
// ============================================================

export async function getCommissionLedger(recipientId?: string): Promise<CommissionLedgerEntry[]> {
  return [];
}

export async function createCommissionLedgerEntry(data: Omit<CommissionLedgerEntry, "id">): Promise<CommissionLedgerEntry> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("CommissionLedger"), {
      fields: {
        RecipientId: data.recipientId,
        RecipientName: data.recipientName,
        OrderId: data.salesOrderId || "",
        Amount: data.amount,
        EntryType: data.entryType,
        RunningBalance: data.runningBalance,
        Description: data.description,
        CreatedAt: data.createdAt,
        CreatedBy: data.createdBy,
      },
    });
    return { ...data, id: String(res.id) } as CommissionLedgerEntry;
  } catch (err) {
    console.error("createCommissionLedgerEntry failed:", err);
    return { ...data, id: "failed" } as CommissionLedgerEntry;
  }
}

export async function getCommissionBalance(recipientId: string): Promise<number> {
  return 0;
}

// ============================================================
// SCCG Coin Wallets
// ============================================================

// ============================================================
// Certificates & Verification
// ============================================================

const CERT_COL = {
  sccgId: "Code",
  certificateNumber: "CertificateNumber",
  certificateType: "Type",
  studentUserId: "UserId",
  studentName: "UserName",
  studentEmail: "UserEmail",
  courseId: "CourseId",
  courseName: "CourseName",
  issueDate: "IssueDate",
  expiryDate: "ExpiryDate",
  issuerName: "IssuerName",
  status: "Status",
  pdfUrl: "PdfUrl",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

export async function getCertificates(userId?: string): Promise<SchoolCertificate[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    let url = `${await getSiteListUrlAsync("Certificates")}?$expand=fields&$orderby=fields/${CERT_COL.issueDate} desc`;
    if (userId) {
      url += `&$filter=fields/${CERT_COL.studentUserId} eq '${escapeOData(userId)}'`;
    }
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        sccgId: String(f[CERT_COL.sccgId] || ""),
        certificateNumber: String(f[CERT_COL.certificateNumber] || ""),
        certificateType: String(f[CERT_COL.certificateType] || "participation") as any,
        studentUserId: String(f[CERT_COL.studentUserId] || ""),
        studentName: String(f[CERT_COL.studentName] || ""),
        studentSccgId: "",
        enrollmentId: "",
        courseId: String(f[CERT_COL.courseId] || ""),
        courseName: String(f[CERT_COL.courseName] || ""),
        courseLevel: "beginner" as any,
        batchId: "",
        batchCode: "",
        attendancePercentage: 0,
        issuedDate: String(f[CERT_COL.issueDate] || ""),
        issuedBy: "system",
        issuedByName: String(f[CERT_COL.issuerName] || ""),
        verificationCode: "",
        verificationUrl: "",
        qrCodeData: "",
        status: String(f[CERT_COL.status] || "active") as any,
        pdfUrl: f[CERT_COL.pdfUrl] ? String(f[CERT_COL.pdfUrl]) : undefined,
        createdAt: String(f[CERT_COL.createdAt] || ""),
        updatedAt: String(f[CERT_COL.updatedAt] || ""),
      } as SchoolCertificate;
    });
  }, () => []);
}

export async function getCertificateByCode(code: string): Promise<SchoolCertificate | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("Certificates")}?$expand=fields&$filter=fields/${CERT_COL.sccgId} eq '${escapeOData(code)}'&$top=1`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    if (!res.value.length) return null;
    const item = res.value[0];
    const f = item.fields;
    return {
      id: String(item.id),
      sccgId: String(f[CERT_COL.sccgId] || ""),
      certificateNumber: String(f[CERT_COL.certificateNumber] || ""),
      certificateType: String(f[CERT_COL.certificateType] || "participation") as any,
      studentUserId: String(f[CERT_COL.studentUserId] || ""),
      studentName: String(f[CERT_COL.studentName] || ""),
      studentSccgId: "",
      enrollmentId: "",
      courseId: String(f[CERT_COL.courseId] || ""),
      courseName: String(f[CERT_COL.courseName] || ""),
      courseLevel: "beginner" as any,
      batchId: "",
      batchCode: "",
      attendancePercentage: 0,
      issuedDate: String(f[CERT_COL.issueDate] || ""),
      issuedBy: "system",
      issuedByName: String(f[CERT_COL.issuerName] || ""),
      verificationCode: "",
      verificationUrl: "",
      qrCodeData: "",
      status: String(f[CERT_COL.status] || "active") as any,
      pdfUrl: f[CERT_COL.pdfUrl] ? String(f[CERT_COL.pdfUrl]) : undefined,
      createdAt: String(f[CERT_COL.createdAt] || ""),
      updatedAt: String(f[CERT_COL.updatedAt] || ""),
    } as SchoolCertificate;
  }, () => null);
}

export async function getCertificateById(id: string): Promise<SchoolCertificate | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphGet<{ fields: Record<string, any> }>(
      `${await getSiteListUrlAsync("Certificates")}/${id}?$expand=fields`
    );
    const f = res.fields;
    return {
      id: String(id),
      sccgId: String(f[CERT_COL.sccgId] || ""),
      certificateNumber: String(f[CERT_COL.certificateNumber] || ""),
      certificateType: String(f[CERT_COL.certificateType] || "participation") as any,
      studentUserId: String(f[CERT_COL.studentUserId] || ""),
      studentName: String(f[CERT_COL.studentName] || ""),
      studentSccgId: "",
      enrollmentId: "",
      courseId: String(f[CERT_COL.courseId] || ""),
      courseName: String(f[CERT_COL.courseName] || ""),
      courseLevel: "beginner" as any,
      batchId: "",
      batchCode: "",
      attendancePercentage: 0,
      issuedDate: String(f[CERT_COL.issueDate] || ""),
      issuedBy: "system",
      issuedByName: String(f[CERT_COL.issuerName] || ""),
      verificationCode: "",
      verificationUrl: "",
      qrCodeData: "",
      status: String(f[CERT_COL.status] || "active") as any,
      pdfUrl: f[CERT_COL.pdfUrl] ? String(f[CERT_COL.pdfUrl]) : undefined,
      createdAt: String(f[CERT_COL.createdAt] || ""),
      updatedAt: String(f[CERT_COL.updatedAt] || ""),
    } as SchoolCertificate;
  }, () => null);
}

export async function createCertificate(data: Omit<SchoolCertificate, "id">): Promise<SchoolCertificate> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("Certificates"), {
    fields: {
      [CERT_COL.sccgId]: data.sccgId,
      [CERT_COL.certificateNumber]: data.certificateNumber,
      [CERT_COL.certificateType]: data.certificateType,
      [CERT_COL.studentUserId]: data.studentUserId,
      [CERT_COL.studentName]: data.studentName,
      [CERT_COL.studentEmail]: (data as any).studentEmail || "",
      [CERT_COL.courseId]: data.courseId,
      [CERT_COL.courseName]: data.courseName,
      [CERT_COL.issueDate]: data.issuedDate,
      [CERT_COL.expiryDate]: data.validUntil || null,
      [CERT_COL.issuerName]: data.issuedByName,
      [CERT_COL.status]: data.status,
      [CERT_COL.pdfUrl]: data.pdfUrl,
      [CERT_COL.createdAt]: data.createdAt,
    },
  });
  return { ...data, id: String(res.id) } as SchoolCertificate;
}

// ============================================================
// SCCG Gift Cards
// ============================================================

export async function getGiftCards(userId?: string): Promise<SccgCard[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("GiftCards")}?$expand=fields`;
  if (userId) url += `&$filter=fields/IssuedToUserId eq '${userId}'`;

  const res = await graphGetSafe<{ value: Array<{ fields: Record<string, any> }> }>(url);
  if (!res || !res.value) return [];

  return res.value.map(item => {
    const f = item.fields;
    return {
      id: f.id,
      sccgId: f.SccgId,
      cardNumber: f.CardNumber,
      pinHash: f.PinHash,
      status: f.Status,
      currentBalance: Number(f.Balance || 0),
      balance: Number(f.Balance || 0),
      issuedToName: f.IssuedToName,
      issuedAt: f.IssuedAt,
    } as SccgCard;
  });
}

export async function getGiftCardById(id: string): Promise<GiftCard | null> {
  return null;
}

export async function getGiftCardByNumber(cardNumber: string): Promise<SccgCard | null> {
  
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("GiftCards")}?$filter=fields/CardNumber eq '${cardNumber}'&$expand=fields`;
  const res = await graphGetSafe<{ value: Array<{ fields: Record<string, any> }> }>(url);
  
  if (!res || !res.value || res.value.length === 0) return null;
  const f = res.value[0].fields;
  return {
    id: f.id,
    sccgId: f.SccgId,
    cardNumber: f.CardNumber,
    pinHash: f.PinHash,
    status: f.Status,
    currentBalance: Number(f.Balance || 0),
    balance: Number(f.Balance || 0),
    issuedToUserId: f.IssuedToUserId,
    issuedToName: f.IssuedToName,
  } as SccgCard;
}

export async function createGiftCard(data: Omit<SccgCard, "id">): Promise<SccgCard> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<any>(await getSiteListUrlAsync("GiftCards"), {
    fields: {
      SccgId: data.sccgId,
      CardNumber: data.cardNumber,
      PinHash: data.pinHash,
      Status: data.status,
      Balance: data.balance,
      IssuedToUserId: data.issuedToUserId,
      IssuedToName: data.issuedToName,
      IssuedToEmail: data.issuedToEmail,
      IssuedAt: data.issuedAt,
      ExpiresAt: data.expiresAt,
    }
  });

  return { ...data, id: res.id } as SccgCard;
}

export async function updateGiftCard(id: string, data: Partial<SccgCard>): Promise<void> {
  try {
    const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("GiftCards");
    // Look up the SP item by stored Id field (genId).
    const lookup = await graphGet<{ value: Array<{ id: string }> }>(
      `${listUrl}?$expand=fields&$filter=fields/Id eq '${escapeOData(id)}'&$top=1`
    );
    const spItemId = lookup.value[0]?.id;
    if (!spItemId) return;
    const fields: Record<string, unknown> = {};
    if (data.status !== undefined) fields.Status = data.status;
    if (data.currentBalance !== undefined) fields.CurrentBalance = data.currentBalance;
    if (data.balance !== undefined) fields.Balance = data.balance;
    if (data.pinHash !== undefined) fields.PinHash = data.pinHash;
    if (data.pinAttempts !== undefined) fields.PinAttempts = data.pinAttempts;
    if (data.lastUsedAt !== undefined) fields.LastUsedAt = data.lastUsedAt;
    if (data.notes !== undefined) fields.Notes = data.notes;
    if (Object.keys(fields).length === 0) return;
    await graphPatch(`${listUrl}/${spItemId}/fields`, fields);
  } catch (err) {
    console.error("updateGiftCard live write failed:", err);
  }
}

export async function getGiftCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
  return [];
}

export async function createGiftCardTransaction(data: Omit<GiftCardTransaction, "id">): Promise<GiftCardTransaction> {

  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<any>(await getSiteListUrlAsync("GiftCardTransactions"), {
    fields: {
      GiftCardId: data.giftCardId,
      TransactionType: data.transactionType,
      Type: data.type,
      Amount: data.amount,
      RunningBalance: data.runningBalance,
      BalanceAfter: data.balanceAfter,
      Description: data.description,
      CreatedAt: data.createdAt,
      CreatedBy: data.createdBy,
    }
  });

  return { ...data, id: res.id } as GiftCardTransaction;
}

// ============================================================
// User Roles
// ============================================================

export async function getUserRoles(userId: string): Promise<UserRoleEntry[]> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("UserRoles")}?$expand=fields&$filter=fields/${UR_COL.userAccountId} eq '${userId}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    return res.value.map(item => {
      const f = item.fields;
      return {
        id: String(item.id),
        userAccountId: String(f[UR_COL.userAccountId]),
        role: String(f[UR_COL.role]) as any,
        status: String(f[UR_COL.status]) as any,
        grantedAt: String(f[UR_COL.grantedAt] || ""),
        grantedBy: String(f[UR_COL.grantedBy] || ""),
        revokedAt: f[UR_COL.revokedAt] ? String(f[UR_COL.revokedAt]) : undefined,
        notes: f[UR_COL.notes] ? String(f[UR_COL.notes]) : undefined,
      };
    });
  }, () => []);
}

export async function addUserRole(entry: Omit<UserRoleEntry, "id">): Promise<UserRoleEntry> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("UserRoles"), {
    fields: {
      [UR_COL.userAccountId]: entry.userAccountId,
      [UR_COL.role]: entry.role,
      [UR_COL.status]: entry.status,
      [UR_COL.grantedAt]: entry.grantedAt,
      [UR_COL.grantedBy]: entry.grantedBy,
      [UR_COL.notes]: entry.notes || "",
    }
  });
  return { ...entry, id: String(res.id) };
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  return runSafe(async () => {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("UserProfiles")}?$expand=fields&$filter=fields/${UP_COL.email} eq '${email}'`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(url);
    if (!res.value.length) return null;
    const item = res.value[0];
    const f = item.fields;
    return {
      id: String(item.id),
      firebaseUid: String(f[UP_COL.firebaseUid] || ""),
      email: String(f[UP_COL.email] || ""),
      displayName: String(f[UP_COL.displayName] || ""),
      phone: String(f[UP_COL.phone] || ""),
      role: String(f[UP_COL.role]) as any,
      company: String(f[UP_COL.company] || ""),
      specialization: String(f[UP_COL.specialization] || ""),
      status: String(f[UP_COL.status]) as any,
      createdAt: String(f[UP_COL.createdAt] || ""),
      updatedAt: String(f[UP_COL.updatedAt] || ""),
    };
  }, () => null);
}

// ============================================================
// User Profiles
// ============================================================
import type { UserProfile, UserRoleType } from "@/types";

export async function getAllUserProfiles(): Promise<(UserProfile & { roles: string[] })[]> {
  
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const [profRes, roleRes] = await Promise.all([
    graphGet<{ value: Array<{ fields: Record<string, unknown>; id: string }> }>(`${await getSiteListUrlAsync("UserProfiles")}?$expand=fields`),
    graphGet<{ value: Array<{ fields: Record<string, unknown>; id: string }> }>(`${await getSiteListUrlAsync("UserRoles")}?$expand=fields&$filter=fields/Status eq 'active'`),
  ]);

  const rolesMap = new Map<string, string[]>();
  roleRes.value.forEach(item => {
    const f = item.fields;
    const uid = String(f[UR_COL.userAccountId]);
    const role = String(f[UR_COL.role]);
    if (!rolesMap.has(uid)) rolesMap.set(uid, []);
    rolesMap.get(uid)!.push(role);
  });

  return profRes.value.map(item => {
    const f = item.fields;
    const userId = String(item.id);
    return {
      id: userId,
      firebaseUid: String(f[UP_COL.firebaseUid] || ""),
      email: String(f[UP_COL.email] || ""),
      displayName: String(f[UP_COL.displayName] || ""),
      phone: String(f[UP_COL.phone] || ""),
      role: String(f[UP_COL.role]) as any,
      company: String(f[UP_COL.company] || ""),
      specialization: String(f[UP_COL.specialization] || ""),
      status: String(f[UP_COL.status]) as any,
      createdAt: String(f[UP_COL.createdAt] || ""),
      updatedAt: String(f[UP_COL.updatedAt] || ""),
      roles: rolesMap.get(userId) || [String(f[UP_COL.role])],
    };
  });
}

export async function createUserProfile(data: Omit<UserProfile, "id">): Promise<UserProfile> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("UserProfiles"), {
    fields: {
      [UP_COL.displayName]: data.displayName,
      [UP_COL.email]: data.email,
      [UP_COL.phone]: data.phone,
      [UP_COL.role]: data.role,
      [UP_COL.company]: data.company,
      [UP_COL.status]: data.status,
      [UP_COL.firebaseUid]: data.firebaseUid,
      [UP_COL.createdAt]: data.createdAt,
      [UP_COL.updatedAt]: data.updatedAt,
    }
  });
  
  return { ...data, id: String(res.id) };
}

export async function createUserRole(data: Omit<UserRoleEntry, "id">): Promise<void> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("UserRoles"), {
    fields: {
      [UR_COL.userAccountId]: data.userAccountId,
      [UR_COL.role]: data.role,
      [UR_COL.status]: data.status,
      [UR_COL.grantedAt]: data.grantedAt,
      [UR_COL.grantedBy]: data.grantedBy,
    }
  });
}

export async function updateUserProfileRoles(userId: string, newRoles: UserRoleType[]): Promise<void> {

  const { graphGet, graphPost, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  // 1. Get existing active roles
  const listUrl = await getSiteListUrlAsync("UserRoles");
  const existing = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
    `${listUrl}?$expand=fields&$filter=fields/UserAccountId eq '${userId}' and fields/Status eq 'active'`
  );

  // 2. Revoke them
  await Promise.all(existing.value.map(item => 
    graphPatch(`${listUrl}/${item.id}/fields`, {
      [UR_COL.status]: "revoked",
      [UR_COL.revokedAt]: new Date().toISOString()
    })
  ));

  // 3. Add new ones
  await Promise.all(newRoles.map(role => 
    graphPost(listUrl, {
      fields: {
        [UR_COL.userAccountId]: userId,
        [UR_COL.role]: role,
        [UR_COL.status]: "active",
        [UR_COL.grantedAt]: new Date().toISOString(),
        [UR_COL.grantedBy]: "admin"
      }
    })
  ));
}


// ============================================================
// Code Generation Helpers
// ============================================================

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePromoCodeString(prefix: string, length: number = 6): string {
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function generateGiftCardNumber(): string {
  const group = () => {
    let s = "";
    for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10);
    return s;
  };
  return `SCCG-GC-${group()}-${group()}-${group()}`;
}

export function generateGiftCardPin(length: number = 4): string {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

export async function getKanbanTaskById(id: string): Promise<KanbanTask | null> {
  
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("KanbanTasks")}('${id}')?$expand=fields`;
  const res = await graphGetSafe<{ id: string; fields: Record<string, unknown> }>(url);
  if (!res) return null;
  
  const f = res.fields;
  return {
    id: String(res.id),
    title: String(f[KT_COL.title] || ""),
    description: f[KT_COL.description] ? String(f[KT_COL.description]) : undefined,
    status: String(f[KT_COL.status] || "todo") as any,
    priority: String(f[KT_COL.priority] || "medium") as any,
    dueDate: f[KT_COL.dueDate] ? String(f[KT_COL.dueDate]) : undefined,
    assignedTo: f[KT_COL.assignedTo] ? String(f[KT_COL.assignedTo]) : undefined,
    assignedToName: f[KT_COL.assignedToName] ? String(f[KT_COL.assignedToName]) : undefined,
    assignedToEmail: f[KT_COL.assignedToEmail] ? String(f[KT_COL.assignedToEmail]) : undefined,
    tags: f[KT_COL.tags] ? String(f[KT_COL.tags]).split(",").filter(Boolean) : [],
    comments: f[KT_COL.comments] ? JSON.parse(String(f[KT_COL.comments])) : [],
    createdBy: String(f[KT_COL.createdBy] || ""),
    createdAt: String(f[KT_COL.createdAt] || ""),
    updatedAt: String(f[KT_COL.updatedAt] || ""),
  } as KanbanTask;
}

export async function createKanbanTask(data: Omit<KanbanTask, "id">): Promise<KanbanTask> {
  const now = new Date().toISOString();

  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
    [KT_COL.title]: data.title,
    [KT_COL.description]: data.description || "",
    [KT_COL.status]: data.status,
    [KT_COL.priority]: data.priority,
    [KT_COL.dueDate]: data.dueDate || null,
    [KT_COL.assignedTo]: data.assignedTo || null,
    [KT_COL.assignedToName]: data.assignedToName || null,
    [KT_COL.assignedToEmail]: data.assignedToEmail || null,
    [KT_COL.tags]: (data as any).tags?.join(",") || "",
    [KT_COL.comments]: JSON.stringify((data as any).comments || []),
    [KT_COL.createdBy]: data.createdBy,
    [KT_COL.createdAt]: now,
    [KT_COL.updatedAt]: now,
  };

  const res = await graphPost<{ id: string }>(`${await getSiteListUrlAsync("KanbanTasks")}`, { fields: body });
  return { ...data, id: res.id, createdAt: now, updatedAt: now } as KanbanTask;
}

export async function deleteOrder(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Orders")}/${id}`);
}

export async function toggleOrderHold(id: string, hold: boolean): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Orders")}/${id}/fields`, { isOnHold: hold });
}

// ============================================================
// Career Profiles (AI engine persistence)
// ============================================================
export interface CareerProfileRecord {
  id: string;
  userId: string;
  userName: string;
  email: string;
  currentRole: string;
  yearsExperience: number;
  education: string[];
  skills: string[];
  goals: string[];
  industry: string;
  profile: string;
  suggestions: string; // serialized JSON
  lastModelVersion: string;
  generatedAt: string;
  updatedAt: string;
}

function serializeArr(a: string[] | undefined): string {
  return JSON.stringify(a ?? []);
}
function parseArr(s: unknown): string[] {
  if (!s) return [];
  try { const v = JSON.parse(String(s)); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export async function getCareerProfile(userId: string): Promise<CareerProfileRecord | null> {
  try {
    const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("CareerProfiles");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
      `${listUrl}?$expand=fields&$filter=fields/UserId eq '${escapeOData(userId)}'&$top=1`
    );
    const item = res.value[0];
    if (!item) return null;
    const f = item.fields;
    return {
      id: String(item.id),
      userId: String(f.UserId || ""),
      userName: String(f.UserName || ""),
      email: String(f.Email || ""),
      currentRole: String(f.CurrentRole || ""),
      yearsExperience: Number(f.YearsExperience || 0),
      education: parseArr(f.Education),
      skills: parseArr(f.Skills),
      goals: parseArr(f.Goals),
      industry: String(f.Industry || ""),
      profile: String(f.Profile || ""),
      suggestions: String(f.Suggestions || "[]"),
      lastModelVersion: String(f.LastModelVersion || ""),
      generatedAt: String(f.GeneratedAt || new Date().toISOString()),
      updatedAt: String(f.UpdatedAt || new Date().toISOString()),
    };
  } catch (err) {
    console.error("getCareerProfile failed:", err);
    return null;
  }
}

export async function upsertCareerProfile(rec: Omit<CareerProfileRecord, "id">): Promise<void> {
  try {
    const { graphGet, graphPost, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("CareerProfiles");
    const lookup = await graphGet<{ value: Array<{ id: string }> }>(
      `${listUrl}?$expand=fields&$filter=fields/UserId eq '${escapeOData(rec.userId)}'&$top=1`
    );
    const fields: Record<string, unknown> = {
      UserId: rec.userId,
      UserName: rec.userName,
      Email: rec.email,
      CurrentRole: rec.currentRole,
      YearsExperience: rec.yearsExperience,
      Education: serializeArr(rec.education),
      Skills: serializeArr(rec.skills),
      Goals: serializeArr(rec.goals),
      Industry: rec.industry,
      Profile: rec.profile,
      Suggestions: rec.suggestions,
      LastModelVersion: rec.lastModelVersion,
      GeneratedAt: rec.generatedAt,
      UpdatedAt: rec.updatedAt,
    };
    const existing = lookup.value[0]?.id;
    if (existing) {
      await graphPatch(`${listUrl}/${existing}/fields`, fields);
    } else {
      await graphPost(listUrl, { fields });
    }
  } catch (err) {
    console.error("upsertCareerProfile failed:", err);
  }
}
