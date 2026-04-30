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
import {
  mockPartners, mockProducts, mockOrders, mockClients,
  mockActivities, mockFinancials, mockInstallments,
  mockTransactions, mockExpenses, mockInvoices,
  mockCustomers, mockExperts, mockServicePackages,
  mockCustomerPackages, mockSessions,
  mockExpertPayments, mockNotifications,
  mockSalesOffers, mockSalesOfferItems,
  mockSalesOrders, mockSalesOrderItems, mockServiceTasks,
  mockPromoCodes, mockCommissionRules, mockCoinWallets, mockGiftCards,
  mockKanbanTasks,
} from "@/lib/mock-data";

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const mockExplicitlyRequested = process.env.USE_MOCK_DATA === "true";

// Default behavior: ALWAYS prefer live SharePoint. Mock data is only used when
// the operator opts in with USE_MOCK_DATA=true. This prevents stale demo data
// leaking into dashboards, quotation, marketplace, etc.
const useMock = mockExplicitlyRequested;
void isProduction;

/**
 * Executes a SharePoint fetch operation with a safe fallback to mock data.
 * Prevents Server Component crashes if MS Graph API is unconfigured or failing.
 */
async function runSafe<T>(liveFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  // Mock mode: return mock immediately.
  if (useMock) return await fallbackFn();

  try {
    return await liveFn();
  } catch (err: any) {
    console.error("SharePoint connection failed:", err?.message || err);

    // Only fall back to mock if Graph credentials are missing (no live data possible).
    // For all other errors, return an empty result so dashboards don't display stale demo data.
    const isConfigMissing = err?.message === "MICROSOFT_GRAPH_CONFIG_MISSING";
    if (isConfigMissing) {
      console.warn("Graph config missing \u2014 falling back to mock data.");
      return await fallbackFn();
    }
    return [] as unknown as T;
  }
}

/**
 * Returns diagnostic information about the SharePoint connection.
 */
export async function getSharePointConnectionInfo() {
  return {
    isProduction,
    mockExplicitlyRequested,
    useMock,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    hasConfig: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
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
  dueDate: "DueDate",
  completedAt: "CompletedAt",
  createdAt: "CreatedAt",
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

// ============================================================
// In-memory mutable stores (for demo CRUD without SharePoint)
// ============================================================
// Singleton pattern for local development to ensure state persistence
// across hot-reloads and between different entry points (pages / API routes).

const getInitialStores = () => ({
  partners: [...mockPartners],
  products: [...mockProducts],
  orders: [...mockOrders],
  clients: [...mockClients],
  activities: [...mockActivities],
  financials: [...mockFinancials],
  installments: [...mockInstallments],
  transactions: [...mockTransactions],
  expenses: [...mockExpenses],
  invoices: [...mockInvoices],
  customers: [...mockCustomers],
  experts: [...mockExperts],
  servicePackages: [...mockServicePackages],
  customerPackages: [...mockCustomerPackages],
  sessions: [...mockSessions],
  expertPayments: [...mockExpertPayments],
  notifications: [...mockNotifications],
  salesOffers: [...mockSalesOffers],
  salesOfferItems: [...mockSalesOfferItems],
  salesOrders: [...mockSalesOrders],
  salesOrderItems: [...mockSalesOrderItems],
  serviceTasks: [...mockServiceTasks],
  promotions: [] as Promotion[],
  referrals: [] as Referral[],
  payouts: [] as Payout[],
  emailTracking: [] as EmailTracking[],
  offerAcceptanceLogs: [] as OfferAcceptanceLog[],
  // New feature stores
  promoCodes: [...mockPromoCodes],
  promoCodeUsages: [] as PromoCodeUsage[],
  commissionRules: [...mockCommissionRules],
  commissionLedger: [] as CommissionLedgerEntry[],
  coinWallets: [...mockCoinWallets],
  coinTransactions: [] as CoinTransaction[],
  giftCards: [...mockGiftCards],
  giftCardTransactions: [] as GiftCardTransaction[],
  userRoles: [] as UserRoleEntry[],
  kanbanTasks: [...mockKanbanTasks],
});

type MockStores = ReturnType<typeof getInitialStores>;

declare global {
  var mockDataStores: MockStores | undefined;
}

const stores: MockStores = globalThis.mockDataStores || (globalThis.mockDataStores = getInitialStores());

function genId(prefix: string): string {
  // Date.now() (ms) + 6 random chars: collision-resistant for high-frequency creates
  const rand = Math.random().toString(36).slice(2, 8).padStart(6, "0");
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

// ============================================================
// Partners
// ============================================================
export async function getPartnerByEmail(email: string): Promise<Partner | null> {
  if (useMock) {
    return stores.partners.find((p) => p.email === email) || null;
  }
  // Graph API implementation (use when SharePoint is configured)
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Partners")}?$filter=fields/Email eq '${email}'&$expand=fields`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(url);
  if (!res.value.length) return null;
  const f = res.value[0].fields;
  return { id: f.id, name: f.Name, email: f.Email, passwordHash: f.PasswordHash, role: f.Role as Partner["role"], status: f.Status as Partner["status"], company: f.Company, createdAt: f.CreatedAt } as Partner;
}

export async function getPartners(): Promise<Partner[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(
        `${await getSiteListUrlAsync("Partners")}?$expand=fields`
      );
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: f.id,
          name: f.Title || f.Name,
          email: f.Email,
          passwordHash: f.PasswordHash || "",
          role: (f.Role as any) || "partner",
          status: (f.Status as any) || "active",
          company: f.Company || "",
          phone: f.Phone,
          partnerType: (f.PartnerType as any) || "individual",
          commissionTier: (f.CommissionTier as any) || "standard",
          onboardingStatus: (f.OnboardingStatus as any) || "approved",
          createdAt: f.CreatedAt,
        } as Partner;
      });
    },
    () => stores.partners
  );
}

export async function createPartner(data: Omit<Partner, "id" | "createdAt">): Promise<Partner> {
  if (useMock) {
    const newPartner: Partner = {
      ...data,
      id: genId("ptn_"),
      createdAt: new Date().toISOString(),
    };
    stores.partners.push(newPartner);
    return newPartner;
  }
  throw new Error("Registration via SharePoint is currently unsupported. USE_MOCK_DATA must be true.");
}

export async function updatePartnerStatus(id: string, status: Partner["status"]): Promise<void> {
  if (useMock) {
    const p = stores.partners.find((x) => x.id === id);
    if (p) p.status = status;
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Partners")}('${id}')/fields`, { Status: status });
}

// ============================================================
// Products
// ============================================================
export async function getProducts(): Promise<Product[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(
        `${await getSiteListUrlAsync("Products")}?$expand=fields`
      );
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(f.id),
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
          tags: f[PR_COL.tags] ? String(f[PR_COL.tags]).split(",").map(t => t.trim()).filter(Boolean) : [],
          sortOrder: Number(f[PR_COL.sortOrder] || 0),
        } as Product;
      });
    },
    () => stores.products
  );
}

export async function createProduct(data: Omit<Product, "id">): Promise<Product> {
  if (useMock) {
    const item: Product = { ...data, id: genId("prod") };
    stores.products.push(item);
    return item;
  }
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
  if (useMock) {
    const idx = stores.products.findIndex((p) => p.id === id);
    if (idx !== -1) stores.products[idx] = { ...stores.products[idx], ...data };
    return;
  }
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
  await graphPatch(`${await getSiteListUrlAsync("Products")}('${id}')/fields`, body);
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
      const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(f.id), partnerId: String(f.PartnerId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), items: JSON.parse(String(f.Items || "[]")), status: String(f.Status), totalAmount: Number(f.TotalAmount), createdAt: String(f.CreatedAt) } as Order;
      });
    },
    () => partnerId ? stores.orders.filter((o) => o.partnerId === partnerId) : stores.orders
  );
}

export async function createOrder(order: Omit<Order, "id">): Promise<Order> {
  const newOrder = { ...order, id: genId("o") } as Order;
  if (useMock) {
    stores.orders.push(newOrder);
    return newOrder;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Orders"), { fields: { PartnerId: newOrder.partnerId, ClientId: newOrder.clientId, ClientName: newOrder.clientName, Items: JSON.stringify(newOrder.items), Status: newOrder.status, TotalAmount: newOrder.totalAmount, CreatedAt: newOrder.createdAt } });
  return newOrder;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
  if (useMock) {
    const o = stores.orders.find((x) => x.id === id);
    if (o) o.status = status;
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Orders")}('${id}')/fields`, { Status: status });
}

// ============================================================
// Clients
// ============================================================
export async function getClients(partnerId?: string): Promise<Client[]> {
  if (useMock) {
    return partnerId ? stores.clients.filter((c) => c.partnerId === partnerId) : stores.clients;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Clients")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: f.id, partnerId: f.PartnerId, name: f.Name, email: f.Email, phone: f.Phone, company: f.Company, address: f.Address, createdAt: f.CreatedAt } as Client;
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  if (useMock) return stores.clients.find((c) => c.id === id) || null;
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Clients")}('${id}')?$expand=fields`;
  const res = await graphGet<{ fields: Record<string, string> }>(url);
  const f = res.fields;
  return { id: f.id, partnerId: f.PartnerId, name: f.Name, email: f.Email, phone: f.Phone, company: f.Company, address: f.Address, createdAt: f.CreatedAt } as Client;
}

export async function createClient(client: Omit<Client, "id">): Promise<Client> {
  const newClient = { ...client, id: genId("c") } as Client;
  if (useMock) {
    stores.clients.push(newClient);
    return newClient;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Clients"), { fields: { PartnerId: newClient.partnerId, Name: newClient.name, Email: newClient.email, Phone: newClient.phone, Company: newClient.company, Address: newClient.address, CreatedAt: newClient.createdAt } });
  return newClient;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  if (useMock) {
    const c = stores.clients.find((x) => x.id === id);
    if (c) Object.assign(c, data);
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Clients")}('${id}')/fields`, data);
}

export async function deleteClient(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.clients.findIndex((c) => c.id === id);
    if (idx !== -1) stores.clients.splice(idx, 1);
    return;
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Clients")}('${id}')`);
}

// ============================================================
// Activities
// ============================================================
export async function getActivities(partnerId?: string): Promise<Activity[]> {
  if (useMock) {
    const list = partnerId ? stores.activities.filter((a) => a.partnerId === partnerId) : stores.activities;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Activities")}?$expand=fields&$orderby=fields/CreatedAt desc`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: f.id, partnerId: f.PartnerId, type: f.Type, description: f.Description, relatedId: f.RelatedId, createdAt: f.CreatedAt } as Activity;
  });
}

export async function createActivity(activity: Omit<Activity, "id">): Promise<void> {
  if (useMock) {
    stores.activities.unshift({ ...activity, id: genId("a") } as Activity);
    return;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Activities"), { fields: { PartnerId: activity.partnerId, Type: activity.type, Description: activity.description, RelatedId: activity.relatedId, CreatedAt: activity.createdAt } });
}

// ============================================================
// Financials
// ============================================================
export async function getFinancials(partnerId?: string): Promise<Financial[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("Financials")}?$expand=fields`;
      if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
      const res = await graphGet<{ value: Array<{ fields: Record<string, string | number> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(f.id), partnerId: String(f.PartnerId), period: String(f.Period), revenue: Number(f.Revenue), outstanding: Number(f.Outstanding), paid: Number(f.Paid), createdAt: String(f.CreatedAt) } as Financial;
      });
    },
    () => partnerId ? stores.financials.filter((f) => f.partnerId === partnerId) : stores.financials
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
      const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return { id: String(f.id), orderId: String(f.OrderId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), partnerId: String(f.PartnerId), installmentNumber: Number(f.InstallmentNumber), totalInstallments: Number(f.TotalInstallments), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, dueDate: String(f.DueDate), paidDate: f.PaidDate ? String(f.PaidDate) : undefined, status: String(f.Status), notes: f.Notes ? String(f.Notes) : undefined } as Installment;
      });
    },
    () => partnerId ? stores.installments.filter((i) => i.partnerId === partnerId) : stores.installments
  );
}

export async function getInstallmentsByClient(clientId: string): Promise<Installment[]> {
  if (useMock) return stores.installments.filter((i) => i.clientId === clientId);
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
      id: genId("i"),
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
    if (useMock) {
      stores.installments.push(inst);
    }
  }

  // Persist to live SharePoint when not in mock mode
  if (!useMock) {
    try {
      const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
      const url = await getSiteListUrlAsync("Installments");
      for (const inst of installments) {
        try {
          await graphPost(url, {
            fields: {
              OrderId: inst.orderId,
              ClientId: inst.clientId,
              ClientName: inst.clientName,
              PartnerId: inst.partnerId,
              InstallmentNumber: inst.installmentNumber,
              TotalInstallments: inst.totalInstallments,
              Amount: inst.amount,
              AmountEUR: inst.amountEur ?? null,
              ConversionRate: inst.conversionRate ?? null,
              DueDate: inst.dueDate,
              Status: inst.status,
            },
          });
        } catch (e) {
          console.error(`Failed to persist installment #${inst.installmentNumber} for order ${orderId}:`, (e as Error).message);
        }
      }
    } catch (e) {
      console.error("Installment persistence failed (Graph unreachable):", (e as Error).message);
    }
  }

  return installments;
}

export async function markInstallmentPaid(id: string, paidDate: string): Promise<void> {
  if (useMock) {
    const inst = stores.installments.find((i) => i.id === id);
    if (inst) {
      inst.status = "paid";
      inst.paidDate = paidDate;
    }
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Installments")}('${id}')/fields`, { Status: "paid", PaidDate: paidDate });
}

// ============================================================
// Transactions
// ============================================================
export async function getTransactions(partnerId?: string): Promise<Transaction[]> {
  if (useMock) {
    return partnerId ? stores.transactions.filter((t) => t.partnerId === partnerId) : stores.transactions;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Transactions")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), clientId: String(f.ClientId), partnerId: String(f.PartnerId), type: String(f.Type), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, reference: String(f.Reference), orderId: f.OrderId ? String(f.OrderId) : undefined, description: f.Description ? String(f.Description) : undefined, date: String(f.Date) } as Transaction;
  });
}

export async function getTransactionsByClient(clientId: string): Promise<Transaction[]> {
  if (useMock) return stores.transactions.filter((t) => t.clientId === clientId);
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Transactions")}?$expand=fields&$filter=fields/ClientId eq '${clientId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), clientId: String(f.ClientId), partnerId: String(f.PartnerId), type: String(f.Type), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, reference: String(f.Reference), orderId: f.OrderId ? String(f.OrderId) : undefined, description: f.Description ? String(f.Description) : undefined, date: String(f.Date) } as Transaction;
  });
}

export async function createTransaction(tx: Omit<Transaction, "id">): Promise<Transaction> {
  const newTx = { ...tx, id: genId("t") } as Transaction;
  try {
    // compute EUR equivalent for BDT inputs and store conversion rate
    const { getBdtToEurRate } = await import("./currency");
    const rate = await getBdtToEurRate();
    const eur = Math.round((newTx.amount * rate + Number.EPSILON) * 100) / 100;
    (newTx as any).amountEur = eur;
    (newTx as any).conversionRate = rate;
  } catch (err) {
    // ignore conversion errors — conversion is best-effort
  }
  if (useMock) {
    stores.transactions.push(newTx);
    return newTx;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Transactions"), { fields: { ClientId: newTx.clientId, PartnerId: newTx.partnerId, Type: newTx.type, Amount: newTx.amount, AmountEUR: (newTx as any).amountEur ?? null, ConversionRate: (newTx as any).conversionRate ?? null, Reference: newTx.reference, OrderId: newTx.orderId, Description: newTx.description, Date: newTx.date } });
  return newTx;
}

// ============================================================
// Expenses
// ============================================================
export async function getExpenses(partnerId?: string): Promise<Expense[]> {
  if (useMock) {
    return partnerId ? stores.expenses.filter((e) => e.partnerId === partnerId) : stores.expenses;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Expenses")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string | number> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), partnerId: String(f.PartnerId), category: String(f.Category), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, description: String(f.Description), date: String(f.Date) } as Expense;
  });
}

export async function createExpense(expense: Omit<Expense, "id">): Promise<Expense> {
  const newExpense = { ...expense, id: genId("e") } as Expense;
  try {
    const { getBdtToEurRate } = await import("./currency");
    const rate = await getBdtToEurRate();
    const eur = Math.round((newExpense.amount * rate + Number.EPSILON) * 100) / 100;
    (newExpense as any).amountEur = eur;
    (newExpense as any).conversionRate = rate;
  } catch (err) {
    // ignore
  }
  if (useMock) {
    stores.expenses.push(newExpense);
    return newExpense;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Expenses"), { fields: { PartnerId: newExpense.partnerId, Category: newExpense.category, Amount: newExpense.amount, AmountEUR: (newExpense as any).amountEur ?? null, ConversionRate: (newExpense as any).conversionRate ?? null, Description: newExpense.description, Date: newExpense.date } });
  return newExpense;
}

// ============================================================
// Invoices
// ============================================================
export async function getInvoices(partnerId?: string): Promise<Invoice[]> {
  if (useMock) {
    return partnerId ? stores.invoices.filter((i) => i.partnerId === partnerId) : stores.invoices;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Invoices")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), partnerId: String(f.PartnerId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), orderId: f.OrderId ? String(f.OrderId) : undefined, amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, status: String(f.Status), dueDate: String(f.DueDate), createdAt: String(f.CreatedAt) } as Invoice;
  });
}

export async function createInvoice(invoice: Omit<Invoice, "id">): Promise<Invoice> {
  const newInvoice = { ...invoice, id: genId("inv") } as Invoice;
  try {
    const { getBdtToEurRate } = await import("./currency");
    const rate = await getBdtToEurRate();
    const eur = Math.round((newInvoice.amount * rate + Number.EPSILON) * 100) / 100;
    (newInvoice as any).amountEur = eur;
    (newInvoice as any).conversionRate = rate;
  } catch (err) {
    // ignore conversion errors
  }
  if (useMock) {
    stores.invoices.push(newInvoice);
    return newInvoice;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("Invoices"), { fields: { PartnerId: newInvoice.partnerId, ClientId: newInvoice.clientId, ClientName: newInvoice.clientName, OrderId: newInvoice.orderId, Amount: newInvoice.amount, AmountEUR: (newInvoice as any).amountEur ?? null, ConversionRate: (newInvoice as any).conversionRate ?? null, Status: newInvoice.status, DueDate: newInvoice.dueDate, CreatedAt: newInvoice.createdAt } });
  return newInvoice;
}

// ============================================================
// Customers
// ============================================================
export async function getCustomers(partnerId?: string): Promise<Customer[]> {
  if (useMock) return partnerId ? stores.customers.filter((c) => c.partnerId === partnerId) : stores.customers;
  // GraphAPI implementation omitted (same pattern as other lists)
  return [];
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (useMock) return stores.customers.find((c) => c.id === id) || null;
  return null;
}

export async function createCustomer(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  if (useMock) {
    const newCustomer: Customer = {
      ...data,
      id: genId("usr_"),
      createdAt: new Date().toISOString(),
    };
    stores.customers.push(newCustomer);
    return newCustomer;
  }
  throw new Error("Registration via SharePoint is currently unsupported. USE_MOCK_DATA must be true.");
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  if (useMock) return stores.customers.find((c) => c.email === email) || null;
  return null;
}



// ============================================================
// Experts
// ============================================================
export async function getExperts(): Promise<Expert[]> {
  if (useMock) return stores.experts;
  return [];
}

export async function getExpertById(id: string): Promise<Expert | null> {
  if (useMock) return stores.experts.find((e) => e.id === id) || null;
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
  if (useMock) {
    stores.experts.push(expert);
    return expert;
  }
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
  if (useMock) return stores.experts.find((e) => e.email === email) || null;
  return null;
}

export async function updateExpertStatus(id: string, status: Expert["status"]): Promise<void> {
  if (useMock) { const e = stores.experts.find((x) => x.id === id); if (e) e.status = status; }
}

// ============================================================
// Service Packages
// ============================================================
export async function getServicePackages(): Promise<ServicePackage[]> {
  if (useMock) return stores.servicePackages;
  return [];
}

// ============================================================
// Customer Packages
// ============================================================
export async function getCustomerPackages(customerId?: string, partnerId?: string): Promise<CustomerPackage[]> {
  if (useMock) {
    let list = stores.customerPackages;
    if (customerId) list = list.filter((p) => p.customerId === customerId);
    if (partnerId) list = list.filter((p) => p.partnerId === partnerId);
    return list;
  }
  return [];
}

export async function getCustomerPackageById(id: string): Promise<CustomerPackage | null> {
  if (useMock) return stores.customerPackages.find((p) => p.id === id) || null;
  return null;
}

export async function createCustomerPackage(pkg: Omit<CustomerPackage, "id">): Promise<CustomerPackage> {
  const newPkg = { ...pkg, id: genId("cp") } as CustomerPackage;
  if (useMock) { stores.customerPackages.push(newPkg); return newPkg; }
  return newPkg;
}

export async function updateCustomerPackage(id: string, data: Partial<CustomerPackage>): Promise<void> {
  if (useMock) { const p = stores.customerPackages.find((x) => x.id === id); if (p) Object.assign(p, data); }
}

/** Assign expert to a customer package and all its unassigned sessions. */
export async function assignExpertToPackage(packageId: string, expertId: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) return;
  if (useMock) {
    const pkg = stores.customerPackages.find((p) => p.id === packageId);
    if (pkg) { pkg.expertId = expertId; pkg.expertName = expert.name; }
    stores.sessions
      .filter((s) => s.customerPackageId === packageId && !s.expertId)
      .forEach((s) => { s.expertId = expertId; s.expertName = expert.name; });
  }
}

// ============================================================
// Sessions
// ============================================================
export async function getSessionsByPackage(packageId: string): Promise<Session[]> {
  if (useMock) return stores.sessions.filter((s) => s.customerPackageId === packageId).sort((a, b) => a.sessionNumber - b.sessionNumber);
  return [];
}

export async function getSessionsByCustomer(customerId: string): Promise<Session[]> {
  if (useMock) return stores.sessions.filter((s) => s.customerId === customerId).sort((a, b) => a.sessionNumber - b.sessionNumber);
  return [];
}

export async function getSessionsByExpert(expertId: string): Promise<Session[]> {
  if (useMock) return stores.sessions.filter((s) => s.expertId === expertId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [];
}

export async function getSessionById(id: string): Promise<Session | null> {
  if (useMock) return stores.sessions.find((s) => s.id === id) || null;
  return null;
}

export async function scheduleSession(id: string, scheduledAt: string): Promise<void> {
  if (useMock) {
    const s = stores.sessions.find((x) => x.id === id);
    if (s) { s.scheduledAt = scheduledAt; s.status = "scheduled"; }
  }
}

/**
 * Mark a session as completed, increment package counter, and create an
 * ExpertPayment record in "eligible" status.
 */
export async function completeSession(
  sessionId: string,
  expertNotes: string,
  durationMinutes: number
): Promise<{ session: Session; payment: ExpertPayment }> {
  const session = stores.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");

  const now = new Date().toISOString();
  session.status = "completed";
  session.completedAt = now;
  session.expertNotes = expertNotes;
  session.durationMinutes = durationMinutes;

  // Increment package completed counter
  const pkg = stores.customerPackages.find((p) => p.id === session.customerPackageId);
  if (pkg) {
    pkg.completedSessions = Math.min(pkg.completedSessions + 1, pkg.totalSessions);
    if (pkg.completedSessions === pkg.totalSessions) pkg.status = "completed";
  }

  // Update expert stats
  if (session.expertId) {
    const expert = stores.experts.find((e) => e.id === session.expertId);
    if (expert) expert.totalSessionsCompleted += 1;
  }

  // Create expert payment record
  const expert = session.expertId ? stores.experts.find((e) => e.id === session.expertId) : null;
  const payment: ExpertPayment = {
    id: genId("ep"),
    expertId: session.expertId || "",
    expertName: session.expertName,
    sessionId,
    customerId: session.customerId,
    customerName: session.customerName,
    partnerId: session.partnerId,
    amount: expert?.ratePerSession || 0,
    status: "eligible",
    eligibleAt: now,
    createdAt: now,
  };
  try {
    const { getBdtToEurRate } = await import("./currency");
    const rate = await getBdtToEurRate();
    (payment as any).conversionRate = rate;
    (payment as any).amountEur = Math.round(((payment.amount || 0) * rate + Number.EPSILON) * 100) / 100;
  } catch (err) {
    // ignore
  }
  stores.expertPayments.push(payment);

  return { session, payment };
}

// ============================================================
// Expert Payments
// ============================================================
export async function getExpertPayments(expertId?: string, partnerId?: string): Promise<ExpertPayment[]> {
  if (useMock) {
    let list = stores.expertPayments;
    if (expertId) list = list.filter((p) => p.expertId === expertId);
    if (partnerId) list = list.filter((p) => p.partnerId === partnerId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
}

export async function approveExpertPayment(id: string, adminId: string): Promise<void> {
  if (useMock) {
    const p = stores.expertPayments.find((x) => x.id === id);
    if (p) { p.status = "approved"; p.approvedAt = new Date().toISOString(); p.approvedBy = adminId; }
  }
}

export async function markExpertPaymentPaid(id: string): Promise<void> {
  if (useMock) {
    const p = stores.expertPayments.find((x) => x.id === id);
    if (p) { p.status = "paid"; p.paidAt = new Date().toISOString(); }
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
  if (useMock) return stores.notifications.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  if (useMock) return stores.notifications.find((n) => n.id === id) || null;
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

async function findNotifSpItemId(notifId: string): Promise<{ listUrl: string; spItemId: string | null }> {
  const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const listUrl = await getSiteListUrlAsync("AppNotifications");
  const res = await graphGet<{ value: Array<{ id: string }> }>(
    `${listUrl}?$expand=fields&$filter=fields/Id eq '${escapeOData(notifId)}'&$top=1`
  );
  return { listUrl, spItemId: res.value[0]?.id ?? null };
}

export async function markNotificationRead(id: string): Promise<void> {
  if (useMock) {
    const n = stores.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return;
  }
  try {
    const { graphPatch } = await import("@/lib/graph");
    const { listUrl, spItemId } = await findNotifSpItemId(id);
    if (!spItemId) return;
    await graphPatch(`${listUrl}/items/${spItemId}/fields`, { Read: true });
  } catch (err) {
    console.error("markNotificationRead failed:", err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (useMock) {
    stores.notifications.filter((n) => n.userId === userId).forEach((n) => { n.read = true; });
    return;
  }
  try {
    const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("AppNotifications");
    const res = await graphGet<{ value: Array<{ id: string }> }>(
      `${listUrl}?$expand=fields&$filter=fields/UserId eq '${escapeOData(userId)}' and fields/Read eq false&$top=200`
    );
    for (const it of res.value) {
      try {
        await graphPatch(`${listUrl}/items/${it.id}/fields`, { Read: true });
      } catch (err) {
        console.error("markAllNotificationsRead patch failed:", err);
      }
    }
  } catch (err) {
    console.error("markAllNotificationsRead failed:", err);
  }
}

export async function createNotification(notification: Omit<AppNotification, "id">): Promise<AppNotification> {
  const newNotif = { ...notification, id: genId("notif") } as AppNotification;
  if (useMock) {
    stores.notifications.unshift(newNotif);
  } else {
    try {
      const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
      await graphPost<{ id: string }>(await getSiteListUrlAsync("AppNotifications"), {
        fields: {
          Id: newNotif.id,
          UserId: newNotif.userId,
          UserType: newNotif.userType,
          Type: newNotif.type,
          Title: newNotif.title,
          Message: newNotif.message,
          Read: newNotif.read,
          RelatedId: newNotif.relatedId,
          CreatedAt: newNotif.createdAt,
        },
      });
    } catch (err) {
      console.error("createNotification live write failed:", err);
    }
  }
  // Publish to in-process SSE bus.
  try {
    const { publish } = await import("@/lib/notifications-bus");
    publish(newNotif);
  } catch {
    // ignore
  }
  return newNotif;
}

/** Generate all session records for a newly purchased CustomerPackage. */
export async function generateSessionsForPackage(pkg: CustomerPackage): Promise<Session[]> {
  const sessions: Session[] = [];
  for (let i = 1; i <= pkg.totalSessions; i++) {
    const session: Session = {
      id: genId("ses"),
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
    if (useMock) stores.sessions.push(session);
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

/** Generate next order number: ORD-YYYY-NNNNN */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const orders = await getSalesOrders();
  const thisYear = orders.filter((o) => o.orderNumber.startsWith(`ORD-${year}-`));
  const maxSeq = thisYear.reduce((max, o) => {
    const seq = parseInt(o.orderNumber.split("-")[2], 10);
    return seq > max ? seq : max;
  }, 0);
  return `ORD-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
}
/** Generate next invoice number: INV-YYYY-NNNNN */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const invoices = await getInvoices();
  return `INV-${year}-${String(invoices.length + 1).padStart(5, "0")}`;
}


export async function getSalesOffers(partnerId?: string): Promise<SalesOffer[]> {
  if (useMock) {
    const list = partnerId ? stores.salesOffers.filter((o) => o.partnerId === partnerId) : stores.salesOffers;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("SalesOffers")}?$expand=fields&$orderby=fields/CreatedAt desc`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: String(f.id), 
      offerNumber: String(f[SO_COL.offerNumber]), 
      partnerId: String(f[SO_COL.partnerId]),
      partnerName: String(f[SO_COL.partnerName] || ""), 
      clientId: String(f[SO_COL.clientId]),
      clientName: String(f[SO_COL.clientName] || ""), 
      clientEmail: String(f[SO_COL.clientEmail] || ""),
      status: String(f[SO_COL.status]) as SalesOffer["status"], 
      subtotal: Number(f[SO_COL.subtotal]),
      discount: Number(f[SO_COL.discount]), 
      discountType: String(f[SO_COL.discountType] || "fixed") as SalesOffer["discountType"],
      totalAmount: Number(f[SO_COL.totalAmount]), 
      validUntil: String(f[SO_COL.validUntil]),
      notes: String(f[SO_COL.notes] || ""), 
      createdBy: String(f[SO_COL.createdBy]),
      createdAt: String(f[SO_COL.createdAt]), 
      updatedAt: String(f[SO_COL.updatedAt]),
      sentAt: f[SO_COL.sentAt] ? String(f[SO_COL.sentAt]) : undefined,
      acceptedAt: f[SO_COL.acceptedAt] ? String(f[SO_COL.acceptedAt]) : undefined,
      rejectedAt: f[SO_COL.rejectedAt] ? String(f[SO_COL.rejectedAt]) : undefined,
      salesOrderId: f[SO_COL.salesOrderId] ? String(f[SO_COL.salesOrderId]) : undefined,
    } as SalesOffer;
  });
}

export async function getSalesOfferById(id: string): Promise<SalesOffer | null> {
  if (useMock) return stores.salesOffers.find((o) => o.id === id) || null;
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const url = `${await getSiteListUrlAsync("SalesOffers")}('${id}')?$expand=fields`;
    const res = await graphGet<{ fields: Record<string, unknown> }>(url);
    if (!res || !res.fields) return null;
    const f = res.fields;
  return {
    id: String(f.id), 
    offerNumber: String(f[SO_COL.offerNumber]), 
    partnerId: String(f[SO_COL.partnerId]),
    partnerName: String(f[SO_COL.partnerName] || ""), 
    clientId: String(f[SO_COL.clientId]),
    clientName: String(f[SO_COL.clientName] || ""), 
    clientEmail: String(f[SO_COL.clientEmail] || ""),
    status: String(f[SO_COL.status]) as SalesOffer["status"], 
    subtotal: Number(f[SO_COL.subtotal]),
    discount: Number(f[SO_COL.discount]), 
    discountType: String(f[SO_COL.discountType] || "fixed") as SalesOffer["discountType"],
    totalAmount: Number(f[SO_COL.totalAmount]), 
    validUntil: String(f[SO_COL.validUntil]),
    notes: String(f[SO_COL.notes] || ""), 
    createdBy: String(f[SO_COL.createdBy]),
    createdAt: String(f[SO_COL.createdAt]), 
    updatedAt: String(f[SO_COL.updatedAt]),
    sentAt: f[SO_COL.sentAt] ? String(f[SO_COL.sentAt]) : undefined,
    acceptedAt: f[SO_COL.acceptedAt] ? String(f[SO_COL.acceptedAt]) : undefined,
    rejectedAt: f[SO_COL.rejectedAt] ? String(f[SO_COL.rejectedAt]) : undefined,
    salesOrderId: f[SO_COL.salesOrderId] ? String(f[SO_COL.salesOrderId]) : undefined,
  } as SalesOffer;
  } catch (err) {
    return null;
  }
}

export async function createSalesOffer(offer: Omit<SalesOffer, "id">): Promise<SalesOffer> {
  const newOffer = { ...offer, id: genId("sof") } as SalesOffer;
  if (useMock) {
    stores.salesOffers.push(newOffer);
    return newOffer;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string; fields: Record<string, any> }>(await getSiteListUrlAsync("SalesOffers"), {
    fields: {
      [SO_COL.offerNumber]: newOffer.offerNumber, 
      [SO_COL.partnerId]: newOffer.partnerId, 
      [SO_COL.partnerName]: newOffer.partnerName,
      [SO_COL.clientId]: newOffer.clientId, 
      [SO_COL.clientName]: newOffer.clientName, 
      [SO_COL.clientEmail]: newOffer.clientEmail,
      [SO_COL.status]: newOffer.status,
      [SO_COL_EXT.saleType]: newOffer.saleType,
      [SO_COL_EXT.referralId]: newOffer.referralId,
      [SO_COL_EXT.referralName]: newOffer.referralName,
      [SO_COL_EXT.referralPercent]: newOffer.referralPercent,
      [SO_COL.subtotal]: newOffer.subtotal, 
      [SO_COL.discount]: newOffer.discount,
      [SO_COL.discountType]: newOffer.discountType, 
      [SO_COL.totalAmount]: newOffer.totalAmount, 
      [SO_COL.validUntil]: newOffer.validUntil,
      [SO_COL.notes]: newOffer.notes, 
      [SO_COL.createdBy]: newOffer.createdBy,
      [SO_COL.createdAt]: newOffer.createdAt, 
      [SO_COL.updatedAt]: newOffer.updatedAt,
    },
  });
  return { ...newOffer, id: String(res.id) };
}

export async function updateSalesOffer(id: string, data: Partial<SalesOffer>): Promise<void> {
  if (useMock) {
    const o = stores.salesOffers.find((x) => x.id === id);
    if (o) Object.assign(o, data, { updatedAt: new Date().toISOString() });
    return;
  }
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
  await graphPatch(`${await getSiteListUrlAsync("SalesOffers")}('${id}')/fields`, fields);
}

export async function deleteSalesOffer(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.salesOffers.findIndex((o) => o.id === id);
    if (idx !== -1) stores.salesOffers.splice(idx, 1);
    // Also delete items
    stores.salesOfferItems = stores.salesOfferItems.filter((i) => i.salesOfferId !== id) as typeof stores.salesOfferItems;
    return;
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  // Delete items first
  const items = await getSalesOfferItems(id);
  for (const item of items) {
    await graphDelete(`${await getSiteListUrlAsync("SalesOfferItems")}('${item.id}')`);
  }
  await graphDelete(`${await getSiteListUrlAsync("SalesOffers")}('${id}')`);
}

// ============================================================
// Sales Offer Items
// ============================================================

export async function getSalesOfferItems(salesOfferId: string): Promise<SalesOfferItem[]> {
  if (useMock) return stores.salesOfferItems.filter((i) => i.salesOfferId === salesOfferId);
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("SalesOfferItems")}?$expand=fields&$filter=fields/SalesOfferId eq '${salesOfferId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: String(f.id), 
      salesOfferId: String(f[SOI_COL.salesOfferId]), 
      productId: String(f[SOI_COL.productId]),
      productName: String(f[SOI_COL.productName]), 
      quantity: Number(f[SOI_COL.quantity]),
      unitPrice: Number(f[SOI_COL.unitPrice]), 
      totalPrice: Number(f[SOI_COL.totalPrice]),
    } as SalesOfferItem;
  });
}

export async function createSalesOfferItem(item: Omit<SalesOfferItem, "id">): Promise<SalesOfferItem> {
  const newItem = { ...item, id: genId("sofi") } as SalesOfferItem;
  if (useMock) {
    stores.salesOfferItems.push(newItem);
    return newItem;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("SalesOfferItems"), {
    fields: {
      [SOI_COL.salesOfferId]: newItem.salesOfferId, 
      [SOI_COL.productId]: newItem.productId,
      [SOI_COL.productName]: newItem.productName, 
      [SOI_COL.quantity]: newItem.quantity,
      [SOI_COL.unitPrice]: newItem.unitPrice, 
      [SOI_COL.totalPrice]: newItem.totalPrice,
    },
  });
  return { ...newItem, id: String(res.id) };
}

export async function deleteSalesOfferItem(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.salesOfferItems.findIndex((i) => i.id === id);
    if (idx !== -1) stores.salesOfferItems.splice(idx, 1);
    return;
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("SalesOfferItems")}('${id}')`);
}

// ============================================================
// Sales Orders
// ============================================================

export async function getSalesOrders(partnerId?: string): Promise<SalesOrder[]> {
  if (useMock) {
    const list = partnerId ? stores.salesOrders.filter((o) => o.partnerId === partnerId) : stores.salesOrders;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("SalesOrders")}?$expand=fields&$orderby=fields/CreatedAt desc`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: String(f.id), 
      orderNumber: String(f[ORD_COL.orderNumber]), 
      salesOfferId: String(f[ORD_COL.salesOfferId]),
      offerNumber: String(f[ORD_COL.offerNumber]), 
      partnerId: String(f[ORD_COL.partnerId]),
      partnerName: String(f[ORD_COL.partnerName] || ""), 
      clientId: String(f[ORD_COL.clientId]),
      clientName: String(f[ORD_COL.clientName] || ""), 
      clientEmail: String(f[ORD_COL.clientEmail] || ""),
      status: String(f[ORD_COL.status]) as SalesOrder["status"], 
      totalAmount: Number(f[ORD_COL.totalAmount]),
      notes: String(f[ORD_COL.notes] || ""), 
      createdBy: String(f[ORD_COL.createdBy]),
      createdAt: String(f[ORD_COL.createdAt]), 
      updatedAt: String(f[ORD_COL.updatedAt]),
      completedAt: f[ORD_COL.completedAt] ? String(f[ORD_COL.completedAt]) : undefined,
    } as SalesOrder;
  });
}

export async function getSalesOrderById(id: string): Promise<SalesOrder | null> {
  if (useMock) return stores.salesOrders.find((o) => o.id === id) || null;
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("SalesOrders")}('${id}')?$expand=fields`;
  const res = await graphGet<{ fields: Record<string, unknown> }>(url);
  const f = res.fields;
  return {
    id: String(f.id), 
    orderNumber: String(f[ORD_COL.orderNumber]), 
    salesOfferId: String(f[ORD_COL.salesOfferId]),
    offerNumber: String(f[ORD_COL.offerNumber]), 
    partnerId: String(f[ORD_COL.partnerId]),
    partnerName: String(f[ORD_COL.partnerName] || ""), 
    clientId: String(f[ORD_COL.clientId]),
    clientName: String(f[ORD_COL.clientName] || ""), 
    clientEmail: String(f[ORD_COL.clientEmail] || ""),
    status: String(f[ORD_COL.status]) as SalesOrder["status"], 
    totalAmount: Number(f[ORD_COL.totalAmount]),
    notes: String(f[ORD_COL.notes] || ""), 
    createdBy: String(f[ORD_COL.createdBy]),
    createdAt: String(f[ORD_COL.createdAt]), 
    updatedAt: String(f[ORD_COL.updatedAt]),
    completedAt: f[ORD_COL.completedAt] ? String(f[ORD_COL.completedAt]) : undefined,
  } as SalesOrder;
}

export async function createSalesOrder(order: Omit<SalesOrder, "id">): Promise<SalesOrder> {
  const newOrder = { ...order, id: genId("sord") } as SalesOrder;
  if (useMock) {
    stores.salesOrders.push(newOrder);
    return newOrder;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("SalesOrders"), {
    fields: {
      [ORD_COL.orderNumber]: newOrder.orderNumber, 
      [ORD_COL.salesOfferId]: newOrder.salesOfferId,
      [ORD_COL.offerNumber]: newOrder.offerNumber, 
      [ORD_COL.partnerId]: newOrder.partnerId,
      [ORD_COL.partnerName]: newOrder.partnerName, 
      [ORD_COL.clientId]: newOrder.clientId,
      [ORD_COL.clientName]: newOrder.clientName, 
      [ORD_COL.clientEmail]: newOrder.clientEmail,
      [ORD_COL.status]: newOrder.status, 
      [ORD_COL.totalAmount]: newOrder.totalAmount,
      [ORD_COL.notes]: newOrder.notes, 
      [ORD_COL.createdBy]: newOrder.createdBy,
      [ORD_COL.createdAt]: newOrder.createdAt, 
      [ORD_COL.updatedAt]: newOrder.updatedAt,
    },
  });
  return newOrder;
}

export async function updateSalesOrder(id: string, data: Partial<SalesOrder>): Promise<void> {
  if (useMock) {
    const o = stores.salesOrders.find((x) => x.id === id);
    if (o) Object.assign(o, data, { updatedAt: new Date().toISOString() });
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, unknown> = { [ORD_COL.updatedAt]: new Date().toISOString() };
  if (data.status) fields[ORD_COL.status] = data.status;
  if (data.notes !== undefined) fields[ORD_COL.notes] = data.notes;
  if (data.completedAt) fields[ORD_COL.completedAt] = data.completedAt;
  await graphPatch(`${await getSiteListUrlAsync("SalesOrders")}('${id}')/fields`, fields);
}

// ============================================================
// Sales Order Items
// ============================================================

export async function getSalesOrderItems(salesOrderId: string): Promise<SalesOrderItem[]> {
  if (useMock) return stores.salesOrderItems.filter((i) => i.salesOrderId === salesOrderId);
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("SalesOrderItems")}?$expand=fields&$filter=fields/SalesOrderId eq '${salesOrderId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return {
      id: String(f.id), 
      salesOrderId: String(f[ORDI_COL.salesOrderId]), 
      productId: String(f[ORDI_COL.productId]),
      productName: String(f[ORDI_COL.productName]), 
      quantity: Number(f[ORDI_COL.quantity]),
      unitPrice: Number(f[ORDI_COL.unitPrice]), 
      totalPrice: Number(f[ORDI_COL.totalPrice]),
    } as SalesOrderItem;
  });
}

export async function createSalesOrderItem(item: Omit<SalesOrderItem, "id">): Promise<SalesOrderItem> {
  const newItem = { ...item, id: genId("sordi") } as SalesOrderItem;
  if (useMock) {
    stores.salesOrderItems.push(newItem);
    return newItem;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("SalesOrderItems"), {
    fields: {
      [ORDI_COL.salesOrderId]: newItem.salesOrderId, 
      [ORDI_COL.productId]: newItem.productId,
      [ORDI_COL.productName]: newItem.productName, 
      [ORDI_COL.quantity]: newItem.quantity,
      [ORDI_COL.unitPrice]: newItem.unitPrice, 
      [ORDI_COL.totalPrice]: newItem.totalPrice,
    },
  });
  return newItem;
}

// ============================================================
// Service Tasks
// ============================================================

export async function getServiceTasks(salesOrderId?: string): Promise<ServiceTask[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      let url = `${await getSiteListUrlAsync("ServiceTasks")}?$expand=fields`;
      if (salesOrderId) url += `&$filter=fields/SalesOrderId eq '${salesOrderId}'`;
      const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(f.id), 
          salesOrderId: String(f[ST_COL.salesOrderId]), 
          orderNumber: String(f[ST_COL.orderNumber] || ""),
          title: String(f[ST_COL.title]), 
          description: String(f[ST_COL.description] || ""),
          assignedTo: String(f[ST_COL.assignedTo] || ""), 
          status: String(f[ST_COL.status]) as ServiceTask["status"],
          dueDate: f[ST_COL.dueDate] ? String(f[ST_COL.dueDate]) : undefined,
          completedAt: f[ST_COL.completedAt] ? String(f[ST_COL.completedAt]) : undefined,
          createdAt: String(f[ST_COL.createdAt]),
        } as ServiceTask;
      });
    },
    () => salesOrderId ? stores.serviceTasks.filter((t) => t.salesOrderId === salesOrderId) : stores.serviceTasks
  );
}

export async function createServiceTask(task: Omit<ServiceTask, "id">): Promise<ServiceTask> {
  const newTask = { ...task, id: genId("st") } as ServiceTask;
  if (useMock) {
    stores.serviceTasks.push(newTask);
    return newTask;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPost(await getSiteListUrlAsync("ServiceTasks"), {
    fields: {
      [ST_COL.salesOrderId]: newTask.salesOrderId, 
      [ST_COL.orderNumber]: newTask.orderNumber,
      [ST_COL.title]: newTask.title, 
      [ST_COL.description]: newTask.description,
      [ST_COL.assignedTo]: newTask.assignedTo, 
      [ST_COL.status]: newTask.status,
      [ST_COL.dueDate]: newTask.dueDate, 
      [ST_COL.createdAt]: newTask.createdAt,
    },
  });
  return newTask;
}

export async function updateServiceTask(id: string, data: Partial<ServiceTask>): Promise<void> {
  if (useMock) {
    const t = stores.serviceTasks.find((x) => x.id === id);
    if (t) Object.assign(t, data);
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, unknown> = {};
  if (data.status) fields[ST_COL.status] = data.status;
  if (data.assignedTo !== undefined) fields[ST_COL.assignedTo] = data.assignedTo;
  if (data.completedAt) fields[ST_COL.completedAt] = data.completedAt;
  if (data.title) fields[ST_COL.title] = data.title;
  if (data.description !== undefined) fields[ST_COL.description] = data.description;
  if (data.dueDate) fields[ST_COL.dueDate] = data.dueDate;
  await graphPatch(`${await getSiteListUrlAsync("ServiceTasks")}('${id}')/fields`, fields);
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
    // Copy commission/promo/coin fields so commission engine can settle later
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
      if (!useMock) {
        const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
        await graphDelete(`${await getSiteListUrlAsync("SalesOrders")}('${newOrder.id}')`);
      } else {
        const idx = stores.salesOrders.findIndex((o) => o.id === newOrder.id);
        if (idx !== -1) stores.salesOrders.splice(idx, 1);
      }
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
    },
    () => stores.promotions
  );
}

export async function createPromotion(data: Omit<Promotion, "id">): Promise<Promotion> {
  if (useMock) {
    const item: Promotion = { ...data, id: genId("promo") };
    stores.promotions.push(item);
    return item;
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const body = {
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
  };
  const res = await graphPost<{ id: string }>(`${await getSiteListUrlAsync("Promotions")}`, { fields: body });
  return { ...data, id: res.id };
}

export async function updatePromotion(id: string, data: Partial<Promotion>): Promise<void> {
  if (useMock) {
    const idx = stores.promotions.findIndex((p) => p.id === id);
    if (idx !== -1) stores.promotions[idx] = { ...stores.promotions[idx], ...data };
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Promotions")}('${id}')/fields`, data);
}

export async function deletePromotion(id: string): Promise<void> {
  if (useMock) {
    stores.promotions = stores.promotions.filter((p) => p.id !== id);
    return;
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("Promotions")}('${id}')`);
}

// ============================================================
// Referrals
// ============================================================
export async function getReferrals(partnerId?: string): Promise<Referral[]> {
  if (useMock) {
    return partnerId
      ? stores.referrals.filter((r) => r.referrerId === partnerId)
      : stores.referrals;
  }
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
  if (useMock) {
    const item: Referral = { ...data, id: genId("ref") };
    stores.referrals.push(item);
    return item;
  }
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
  if (useMock) {
    const idx = stores.referrals.findIndex((r) => r.id === id);
    if (idx !== -1) stores.referrals[idx] = { ...stores.referrals[idx], ...data };
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Referrals")}('${id}')/fields`, data);
}

// ============================================================
// Payouts
// ============================================================
export async function getPayouts(recipientId?: string): Promise<Payout[]> {
  if (useMock) {
    return recipientId
      ? stores.payouts.filter((p) => p.recipientId === recipientId)
      : stores.payouts;
  }
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
  if (useMock) {
    const item: Payout = { ...data, id: genId("pay") };
    stores.payouts.push(item);
    return item;
  }
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
  if (useMock) {
    const idx = stores.payouts.findIndex((p) => p.id === id);
    if (idx !== -1) stores.payouts[idx] = { ...stores.payouts[idx], status, payoutDate };
    return;
  }
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphPatch(`${await getSiteListUrlAsync("Payouts")}('${id}')/fields`, {
    [PAY_COL.status]: status,
    [PAY_COL.payoutDate]: payoutDate,
  });
}

// Suppress unused variable warning for extended column map
void SO_COL_EXT;

// ============================================================
// Email Tracking
// ============================================================

export async function createEmailTracking(data: Omit<EmailTracking, "id">): Promise<EmailTracking> {
  const entry = { ...data, id: genId("et") } as EmailTracking;
  if (useMock) {
    stores.emailTracking.push(entry);
    return entry;
  }
  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("EmailTracking"), {
      fields: {
        SalesOfferId: entry.salesOfferId,
        OfferNumber: entry.offerNumber,
        RecipientEmail: entry.recipientEmail,
        RecipientName: entry.recipientName,
        SenderName: entry.senderName,
        Subject: entry.subject,
        Status: entry.status,
        SentAt: entry.sentAt,
        OpenedAt: entry.openedAt,
        AcceptToken: entry.acceptToken,
        CreatedAt: entry.createdAt,
      },
    });
    if (res?.id) entry.id = String(res.id);
  } catch (e) {
    console.error("createEmailTracking failed:", (e as Error).message);
  }
  return entry;
}

export async function getEmailTrackingByOffer(salesOfferId: string): Promise<EmailTracking[]> {
  if (useMock) return stores.emailTracking.filter((e) => e.salesOfferId === salesOfferId);
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
  if (useMock) return stores.emailTracking.find((e) => e.acceptToken === acceptToken) || null;
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
  if (useMock) {
    const entry = stores.emailTracking.find((e) => e.id === id);
    if (entry) Object.assign(entry, data);
    return;
  }
  try {
    const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const fields: Record<string, unknown> = {};
    if (data.status) fields.Status = data.status;
    if (data.openedAt) fields.OpenedAt = data.openedAt;
    if (data.sentAt) fields.SentAt = data.sentAt;
    if (Object.keys(fields).length === 0) return;
    await graphPatch(`${await getSiteListUrlAsync("EmailTracking")}('${id}')/fields`, fields);
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
// Offer Acceptance Logs
// ============================================================

export async function createOfferAcceptanceLog(data: Omit<OfferAcceptanceLog, "id">): Promise<OfferAcceptanceLog> {
  const entry = { ...data, id: genId("oal") } as OfferAcceptanceLog;
  if (useMock) {
    stores.offerAcceptanceLogs.push(entry);
    return entry;
  }
  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("OfferAcceptanceLog"), {
      fields: {
        SalesOfferId: entry.salesOfferId,
        OfferNumber: entry.offerNumber,
        AcceptToken: entry.acceptToken,
        ClientEmail: entry.clientEmail,
        Action: entry.action,
        IpAddress: entry.ipAddress,
        UserAgent: entry.userAgent,
        Timestamp: entry.timestamp,
      },
    });
    if (res?.id) entry.id = String(res.id);
  } catch (e) {
    console.error("createOfferAcceptanceLog failed:", (e as Error).message);
  }
  return entry;
}

export async function getOfferAcceptanceLogs(salesOfferId: string): Promise<OfferAcceptanceLog[]> {
  if (useMock) return stores.offerAcceptanceLogs.filter((l) => l.salesOfferId === salesOfferId);
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
// Promo Codes
// ============================================================

export async function getPromoCodes(ownerId?: string): Promise<PromoCode[]> {
  if (useMock) {
    if (ownerId) return stores.promoCodes.filter((p) => p.ownerId === ownerId);
    return stores.promoCodes;
  }
  return [];
}

export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  if (useMock) return stores.promoCodes.find((p) => p.code === code) || null;
  return null;
}

export async function getPromoCodeById(id: string): Promise<PromoCode | null> {
  if (useMock) return stores.promoCodes.find((p) => p.id === id) || null;
  return null;
}

export async function createPromoCode(data: Omit<PromoCode, "id">): Promise<PromoCode> {
  const item = { ...data, id: genId("pc") } as PromoCode;
  if (useMock) stores.promoCodes.push(item);
  return item;
}

export async function updatePromoCode(id: string, data: Partial<PromoCode>): Promise<void> {
  if (useMock) {
    const p = stores.promoCodes.find((x) => x.id === id);
    if (p) Object.assign(p, data);
  }
}

export async function deletePromoCode(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.promoCodes.findIndex((x) => x.id === id);
    if (idx !== -1) stores.promoCodes.splice(idx, 1);
  }
}

export async function getPromoCodeUsages(promoCodeId?: string): Promise<PromoCodeUsage[]> {
  if (useMock) {
    if (promoCodeId) return stores.promoCodeUsages.filter((u) => u.promoCodeId === promoCodeId);
    return stores.promoCodeUsages;
  }
  return [];
}

export async function createPromoCodeUsage(data: Omit<PromoCodeUsage, "id">): Promise<PromoCodeUsage> {
  const item = { ...data, id: genId("pcu") } as PromoCodeUsage;
  if (useMock) stores.promoCodeUsages.push(item);
  return item;
}

// ============================================================
// Commission Rules
// ============================================================

export async function getCommissionRules(): Promise<CommissionRule[]> {
  if (useMock) return stores.commissionRules.filter((r) => r.isActive).sort((a, b) => b.priority - a.priority);
  return [];
}

export async function getCommissionRuleById(id: string): Promise<CommissionRule | null> {
  if (useMock) return stores.commissionRules.find((r) => r.id === id) || null;
  return null;
}

export async function createCommissionRule(data: Omit<CommissionRule, "id">): Promise<CommissionRule> {
  const item = { ...data, id: genId("cr") } as CommissionRule;
  if (useMock) stores.commissionRules.push(item);
  return item;
}

export async function updateCommissionRule(id: string, data: Partial<CommissionRule>): Promise<void> {
  if (useMock) {
    const r = stores.commissionRules.find((x) => x.id === id);
    if (r) Object.assign(r, data);
  }
}

export async function deleteCommissionRule(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.commissionRules.findIndex((x) => x.id === id);
    if (idx !== -1) stores.commissionRules.splice(idx, 1);
  }
}

// ============================================================
// Commission Ledger
// ============================================================

export async function getCommissionLedger(recipientId?: string): Promise<CommissionLedgerEntry[]> {
  if (useMock) {
    const list = recipientId ? stores.commissionLedger.filter((e) => e.recipientId === recipientId) : stores.commissionLedger;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
}

export async function createCommissionLedgerEntry(data: Omit<CommissionLedgerEntry, "id">): Promise<CommissionLedgerEntry> {
  const item = { ...data, id: genId("cl") } as CommissionLedgerEntry;
  if (useMock) stores.commissionLedger.push(item);
  return item;
}

export async function getCommissionBalance(recipientId: string): Promise<number> {
  if (useMock) {
    return stores.commissionLedger
      .filter((e) => e.recipientId === recipientId)
      .reduce((sum, e) => sum + e.amount, 0);
  }
  return 0;
}

// ============================================================
// SCCG Coin Wallets
// ============================================================

export async function getCoinWallet(userId: string): Promise<CoinWallet | null> {
  if (useMock) return stores.coinWallets.find((w) => w.userId === userId) || null;

  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("CoinWallets")}?$filter=fields/UserId eq '${escapeOData(userId)}'&$expand=fields&$top=1`;
  const res = await graphGetSafe<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);

  if (!res || !res.value || res.value.length === 0) return null;
  const item = res.value[0];
  const f = item.fields;
  return {
    id: String(f.Id || item.id),
    userId: f.UserId,
    userName: String(f.UserName || ""),
    balance: Number(f.Balance || 0),
    totalEarned: Number(f.TotalEarned || 0),
    totalSpent: Number(f.TotalSpent || 0),
    status: (f.Status as CoinWallet["status"]) || "active",
    createdAt: String(f.CreatedAt || new Date().toISOString()),
    updatedAt: String(f.UpdatedAt || f.LastUpdated || new Date().toISOString()),
  } as CoinWallet;
}

export async function getAllCoinWallets(): Promise<CoinWallet[]> {
  if (useMock) return stores.coinWallets;
  try {
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const url = `${await getSiteListUrlAsync("CoinWallets")}?$expand=fields&$top=500`;
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, any> }> }>(url);
    return res.value.map((item) => {
      const f = item.fields;
      return {
        id: String(f.Id || item.id),
        userId: f.UserId,
        userName: String(f.UserName || ""),
        balance: Number(f.Balance || 0),
        totalEarned: Number(f.TotalEarned || 0),
        totalSpent: Number(f.TotalSpent || 0),
        status: (f.Status as CoinWallet["status"]) || "active",
        createdAt: String(f.CreatedAt || new Date().toISOString()),
        updatedAt: String(f.UpdatedAt || f.LastUpdated || new Date().toISOString()),
      } as CoinWallet;
    });
  } catch (err) {
    console.error("getAllCoinWallets failed:", err);
    return [];
  }
}

export async function createCoinWallet(data: Omit<CoinWallet, "id">): Promise<CoinWallet> {
  const item = { ...data, id: genId("w") } as CoinWallet;
  if (useMock) {
    stores.coinWallets.push(item);
    return item;
  }
  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    await graphPost<any>(await getSiteListUrlAsync("CoinWallets"), {
      fields: {
        Id: item.id,
        UserId: item.userId,
        UserName: item.userName,
        Balance: item.balance,
        TotalEarned: item.totalEarned,
        TotalSpent: item.totalSpent,
        Status: item.status,
        CreatedAt: item.createdAt,
        UpdatedAt: item.updatedAt,
      },
    });
  } catch (err) {
    console.error("createCoinWallet live write failed:", err);
  }
  return item;
}

export async function updateCoinWallet(userId: string, data: Partial<CoinWallet>): Promise<void> {
  if (useMock) {
    const w = stores.coinWallets.find((x) => x.userId === userId);
    if (w) Object.assign(w, data, { updatedAt: new Date().toISOString() });
    return;
  }
  try {
    const { graphGet, graphPatch, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("CoinWallets");
    const lookup = await graphGet<{ value: Array<{ id: string }> }>(
      `${listUrl}?$expand=fields&$filter=fields/UserId eq '${escapeOData(userId)}'&$top=1`
    );
    const spItemId = lookup.value[0]?.id;
    if (!spItemId) return;
    const fields: Record<string, unknown> = { UpdatedAt: new Date().toISOString() };
    if (data.balance !== undefined) fields.Balance = data.balance;
    if (data.totalEarned !== undefined) fields.TotalEarned = data.totalEarned;
    if (data.totalSpent !== undefined) fields.TotalSpent = data.totalSpent;
    if (data.status !== undefined) fields.Status = data.status;
    if (data.userName !== undefined) fields.UserName = data.userName;
    await graphPatch(`${listUrl}/items/${spItemId}/fields`, fields);
  } catch (err) {
    console.error("updateCoinWallet live write failed:", err);
  }
}

export async function getCoinTransactions(userId: string): Promise<CoinTransaction[]> {
  if (useMock) return stores.coinTransactions.filter((t) => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [];
}

export async function createCoinTransaction(data: Omit<CoinTransaction, "id">): Promise<CoinTransaction> {
  const item = { ...data, id: genId("ct") } as CoinTransaction;
  if (useMock) {
    stores.coinTransactions.push(item);
    const wallet = stores.coinWallets.find((w) => w.userId === data.userId);
    if (wallet) {
      wallet.balance += data.amount;
      if (data.amount > 0) wallet.totalEarned += data.amount;
      if (data.amount < 0) wallet.totalSpent += Math.abs(data.amount);
      wallet.updatedAt = new Date().toISOString();
    }
    return item;
  }

  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<any>(await getSiteListUrlAsync("CoinTransactions"), {
    fields: {
      WalletId: data.walletId,
      UserId: data.userId,
      TransactionType: data.transactionType,
      Amount: data.amount,
      RunningBalance: data.runningBalance,
      Description: data.description,
      CreatedAt: data.createdAt,
      CreatedBy: data.createdBy,
    }
  });
  // Best-effort wallet balance update (live).
  try {
    const wallet = await getCoinWallet(data.userId);
    if (wallet) {
      const newBalance = wallet.balance + data.amount;
      const totalEarned = data.amount > 0 ? wallet.totalEarned + data.amount : wallet.totalEarned;
      const totalSpent = data.amount < 0 ? wallet.totalSpent + Math.abs(data.amount) : wallet.totalSpent;
      await updateCoinWallet(data.userId, { balance: newBalance, totalEarned, totalSpent });
    } else {
      await createCoinWallet({
        userId: data.userId,
        userName: "",
        balance: data.amount,
        totalEarned: data.amount > 0 ? data.amount : 0,
        totalSpent: data.amount < 0 ? Math.abs(data.amount) : 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("createCoinTransaction wallet balance update failed:", err);
  }
  return { ...data, id: res.id } as CoinTransaction;
}

// ============================================================
// SCCG Gift Cards
// ============================================================

export async function getGiftCards(userId?: string): Promise<SccgCard[]> {
  if (useMock) {
    if (userId) return (stores.giftCards as SccgCard[]).filter((g) => g.issuedToUserId === userId);
    return (stores.giftCards as SccgCard[]);
  }

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
  if (useMock) return stores.giftCards.find((g) => g.id === id) || null;
  return null;
}

export async function getGiftCardByNumber(cardNumber: string): Promise<SccgCard | null> {
  if (useMock) return (stores.giftCards as SccgCard[]).find((g) => g.cardNumber === cardNumber) || null;
  
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
  if (useMock) {
    const item = { ...data, id: genId("gc") } as SccgCard;
    (stores.giftCards as SccgCard[]).push(item);
    return item;
  }

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
  if (useMock) {
    const g = (stores.giftCards as SccgCard[]).find((x) => x.id === id);
    if (g) Object.assign(g, data);
    return;
  }
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
    await graphPatch(`${listUrl}/items/${spItemId}/fields`, fields);
  } catch (err) {
    console.error("updateGiftCard live write failed:", err);
  }
}

export async function getGiftCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
  if (useMock) return stores.giftCardTransactions.filter((t) => t.giftCardId === giftCardId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [];
}

export async function createGiftCardTransaction(data: Omit<GiftCardTransaction, "id">): Promise<GiftCardTransaction> {
  if (useMock) {
    const item = { ...data, id: genId("gct") } as GiftCardTransaction;
    stores.giftCardTransactions.push(item);
    const card = stores.giftCards.find((g) => g.id === data.giftCardId);
    if (card) {
      card.currentBalance += data.amount;
      card.lastUsedAt = new Date().toISOString();
      if (card.currentBalance <= 0) { card.currentBalance = 0; card.status = "depleted"; }
    }
    return item;
  }

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
  if (useMock) return stores.userRoles.filter((r) => r.userAccountId === userId && r.status !== "revoked");
  return [];
}

export async function addUserRole(entry: Omit<UserRoleEntry, "id">): Promise<UserRoleEntry> {
  const item = { ...entry, id: genId("ur") } as UserRoleEntry;
  if (useMock) stores.userRoles.push(item);
  return item;
}

// ============================================================
// User Profiles
// ============================================================
import type { UserProfile, UserRoleType } from "@/types";

export async function getAllUserProfiles(): Promise<(UserProfile & { roles: string[] })[]> {
  if (useMock) {
    const rolesMap = new Map<string, string[]>();
    stores.userRoles.forEach(r => {
      if (r.status !== "revoked") {
        if (!rolesMap.has(r.userAccountId)) rolesMap.set(r.userAccountId, []);
        rolesMap.get(r.userAccountId)!.push(r.role);
      }
    });

    const profiles: (UserProfile & { roles: string[] })[] = [];
    
    stores.partners.forEach(p => {
      const prf = {
        id: p.id,
        firebaseUid: p.firebaseUid || "uid_" + p.id,
        email: p.email,
        displayName: p.name,
        phone: p.phone,
        role: "partner" as const,
        company: p.company,
        status: p.status === "active" ? "active" as const : "suspended" as const,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
        roles: [] as string[],
      };
      if (!rolesMap.has(p.id)) rolesMap.set(p.id, [p.role]);
      prf.roles = Array.from(new Set(rolesMap.get(p.id)));
      profiles.push(prf);
    });

    stores.customers.forEach(p => {
      const prf = {
        id: p.id,
        firebaseUid: "uid_" + p.id,
        email: p.email,
        displayName: p.name,
        phone: p.phone,
        role: "customer" as const,
        company: p.company,
        status: p.status === "active" ? "active" as const : "suspended" as const,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
        roles: [] as string[],
      };
      if (!rolesMap.has(p.id)) rolesMap.set(p.id, ["customer"]);
      prf.roles = Array.from(new Set(rolesMap.get(p.id)));
      profiles.push(prf);
    });
    
    stores.experts.forEach(p => {
      const prf = {
        id: p.id,
        firebaseUid: p.firebaseUid || "uid_" + p.id,
        email: p.email,
        displayName: p.name,
        phone: p.phone,
        role: "expert" as const,
        specialization: p.specialization,
        status: p.status === "active" ? "active" as const : "suspended" as const,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
        roles: [] as string[],
      };
      if (!rolesMap.has(p.id)) rolesMap.set(p.id, ["expert"]);
      prf.roles = Array.from(new Set(rolesMap.get(p.id)));
      profiles.push(prf);
    });

    return profiles;
  }
  
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
  const newItem = { ...data, id: genId("up") } as UserProfile;
  if (useMock) {
    // Add to relevant mock store or just handle in memory
    return newItem;
  }
  
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync("UserProfiles"), {
    fields: {
      [UP_COL.displayName]: newItem.displayName,
      [UP_COL.email]: newItem.email,
      [UP_COL.phone]: newItem.phone,
      [UP_COL.role]: newItem.role,
      [UP_COL.company]: newItem.company,
      [UP_COL.status]: newItem.status,
      [UP_COL.firebaseUid]: newItem.firebaseUid || newItem.id,
      [UP_COL.createdAt]: newItem.createdAt,
      [UP_COL.updatedAt]: newItem.updatedAt,
    }
  });
  
  return { ...newItem, id: String(res.id) };
}

export async function createUserRole(data: Omit<UserRoleEntry, "id">): Promise<void> {
  if (useMock) {
    stores.userRoles.push({ ...data, id: genId("ur") } as UserRoleEntry);
    return;
  }
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
  if (useMock) {
    stores.userRoles.forEach(r => {
      if (r.userAccountId === userId && r.status !== "revoked") {
        r.status = "revoked";
        r.revokedAt = new Date().toISOString();
      }
    });

    newRoles.forEach(role => {
      stores.userRoles.push({
        id: genId("ur"),
        userAccountId: userId,
        role,
        status: "active",
        grantedAt: new Date().toISOString(),
        grantedBy: "admin",
      });
    });
    return;
  }

  const { graphGet, graphPost, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  // 1. Get existing active roles
  const listUrl = await getSiteListUrlAsync("UserRoles");
  const existing = await graphGet<{ value: Array<{ id: string; fields: Record<string, unknown> }> }>(
    `${listUrl}?$expand=fields&$filter=fields/UserAccountId eq '${userId}' and fields/Status eq 'active'`
  );

  // 2. Revoke them
  await Promise.all(existing.value.map(item => 
    graphPatch(`${listUrl}('${item.id}')/fields`, {
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

// ============================================================
// Kanban Task Board
// ============================================================

export async function getKanbanTasks(): Promise<KanbanTask[]> {
  return runSafe(
    async () => {
      const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
      const res = await graphGetSafe<{ value: Array<{ fields: Record<string, unknown> }> }>(
        `${await getSiteListUrlAsync("KanbanTasks")}?$expand=fields`
      );

      if (!res) {
        console.warn("SharePoint 'KanbanTasks' list not found.");
        return stores.kanbanTasks;
      }

      return res.value.map((item) => {
        const f = item.fields;
        return {
          id: String(f.id),
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
          createdAt: String(f[KT_COL.createdAt] || new Date().toISOString()),
          updatedAt: String(f[KT_COL.updatedAt] || new Date().toISOString()),
        } as KanbanTask;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    () => stores.kanbanTasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );
}

export async function getKanbanTaskById(id: string): Promise<KanbanTask | null> {
  if (useMock) return stores.kanbanTasks.find((t) => t.id === id) || null;
  
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("KanbanTasks")}/items('${id}')?$expand=fields`;
  const res = await graphGetSafe<{ fields: Record<string, unknown> }>(url);
  if (!res) return null;
  
  const f = res.fields;
  return {
    id: String(f.id),
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
  if (useMock) {
    const item = { ...data, id: genId("task"), createdAt: now, updatedAt: now } as KanbanTask;
    stores.kanbanTasks.push(item);
    return item;
  }

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

export async function updateKanbanTask(id: string, data: Partial<KanbanTask>): Promise<KanbanTask | null> {
  const now = new Date().toISOString();
  if (useMock) {
    const idx = stores.kanbanTasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    stores.kanbanTasks[idx] = { ...stores.kanbanTasks[idx], ...data, updatedAt: now };
    return stores.kanbanTasks[idx];
  }

  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const body: Record<string, unknown> = {
    [KT_COL.updatedAt]: now,
  };
  if (data.title !== undefined) body[KT_COL.title] = data.title;
  if (data.description !== undefined) body[KT_COL.description] = data.description;
  if (data.status !== undefined) body[KT_COL.status] = data.status;
  if (data.priority !== undefined) body[KT_COL.priority] = data.priority;
  if (data.dueDate !== undefined) body[KT_COL.dueDate] = data.dueDate;
  if (data.assignedTo !== undefined) body[KT_COL.assignedTo] = data.assignedTo;
  if (data.assignedToName !== undefined) body[KT_COL.assignedToName] = data.assignedToName;
  if (data.assignedToEmail !== undefined) body[KT_COL.assignedToEmail] = data.assignedToEmail;
  if ((data as any).tags !== undefined) body[KT_COL.tags] = (data as any).tags?.join(",");
  if ((data as any).comments !== undefined) body[KT_COL.comments] = JSON.stringify((data as any).comments);

  await graphPatch(`${await getSiteListUrlAsync("KanbanTasks")}('${id}')/fields`, body);
  return getKanbanTaskById(id);
}

export async function deleteKanbanTask(id: string): Promise<void> {
  if (useMock) {
    const idx = stores.kanbanTasks.findIndex((t) => t.id === id);
    if (idx !== -1) stores.kanbanTasks.splice(idx, 1);
    return;
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  await graphDelete(`${await getSiteListUrlAsync("KanbanTasks")}('${id}')`);
}

// ============================================================
// School Certificates (SharePoint Mirror)
// ============================================================

const CERT_COL = {
  certificateNumber: "CertificateNumber",
  certificateType: "CertificateType",
  studentName: "StudentName",
  studentEmail: "StudentEmail",
  studentUserId: "StudentUserId",
  studentSccgId: "StudentSccgId",
  courseName: "CourseName",
  courseLevel: "CourseLevel",
  batchCode: "BatchCode",
  attendancePercentage: "AttendancePercentage",
  finalGrade: "FinalGrade",
  examScore: "ExamScore",
  issuedDate: "IssuedDate",
  issuedBy: "IssuedBy",
  issuedByName: "IssuedByName",
  verificationCode: "VerificationCode",
  verificationUrl: "VerificationUrl",
  status: "Status",
  revokedAt: "RevokedAt",
  revocationReason: "RevocationReason",
  revokedBy: "RevokedBy",
  firestoreId: "FirestoreId",
  createdAt: "CreatedAt",
};

function mapSpCertToLocal(f: Record<string, string>): SchoolCertificate {
  return {
    id: f.id || f.FirestoreId || "",
    sccgId: "",
    certificateNumber: f[CERT_COL.certificateNumber] || "",
    certificateType: (f[CERT_COL.certificateType] as SchoolCertificate["certificateType"]) || "participation",
    studentUserId: f[CERT_COL.studentUserId] || "",
    studentName: f[CERT_COL.studentName] || "",
    studentSccgId: f[CERT_COL.studentSccgId] || "",
    enrollmentId: "",
    courseId: "",
    courseName: f[CERT_COL.courseName] || "",
    courseLevel: (f[CERT_COL.courseLevel] as SchoolCertificate["courseLevel"]) || "A1",
    batchId: "",
    batchCode: f[CERT_COL.batchCode] || "",
    attendancePercentage: Number(f[CERT_COL.attendancePercentage]) || 0,
    finalGrade: f[CERT_COL.finalGrade] || undefined,
    examScore: f[CERT_COL.examScore] ? Number(f[CERT_COL.examScore]) : undefined,
    issuedDate: f[CERT_COL.issuedDate] || "",
    issuedBy: f[CERT_COL.issuedBy] || "",
    issuedByName: f[CERT_COL.issuedByName] || "",
    verificationCode: f[CERT_COL.verificationCode] || "",
    verificationUrl: f[CERT_COL.verificationUrl] || "",
    qrCodeData: f[CERT_COL.verificationUrl] || "",
    status: (f[CERT_COL.status] as SchoolCertificate["status"]) || "issued",
    revokedAt: f[CERT_COL.revokedAt] || undefined,
    revocationReason: f[CERT_COL.revocationReason] || undefined,
    revokedBy: f[CERT_COL.revokedBy] || undefined,
    createdAt: f[CERT_COL.createdAt] || "",
  };
}

/**
 * Mirror a certificate to SharePoint when created in Firestore.
 */
export async function mirrorCertificateToSharePoint(cert: SchoolCertificate, studentEmail?: string): Promise<void> {
  if (useMock) return;
  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    await graphPost(await getSiteListUrlAsync("SchoolCertificates"), {
      fields: {
        Title: cert.certificateNumber,
        [CERT_COL.certificateNumber]: cert.certificateNumber,
        [CERT_COL.certificateType]: cert.certificateType,
        [CERT_COL.studentName]: cert.studentName,
        [CERT_COL.studentEmail]: studentEmail || "",
        [CERT_COL.studentUserId]: cert.studentUserId,
        [CERT_COL.studentSccgId]: cert.studentSccgId,
        [CERT_COL.courseName]: cert.courseName,
        [CERT_COL.courseLevel]: cert.courseLevel,
        [CERT_COL.batchCode]: cert.batchCode,
        [CERT_COL.attendancePercentage]: cert.attendancePercentage,
        [CERT_COL.finalGrade]: cert.finalGrade || "",
        [CERT_COL.examScore]: cert.examScore || 0,
        [CERT_COL.issuedDate]: cert.issuedDate,
        [CERT_COL.issuedBy]: cert.issuedBy,
        [CERT_COL.issuedByName]: cert.issuedByName,
        [CERT_COL.verificationCode]: cert.verificationCode,
        [CERT_COL.verificationUrl]: cert.verificationUrl,
        [CERT_COL.status]: cert.status,
        [CERT_COL.firestoreId]: cert.id,
        [CERT_COL.createdAt]: cert.createdAt,
      },
    });
  } catch (err) {
    console.error("SharePoint certificate mirror failed (non-fatal):", err);
  }
}

/**
 * Update certificate status in SharePoint (e.g. revoke).
 */
export async function updateCertificateInSharePoint(firestoreId: string, data: Record<string, string>): Promise<void> {
  if (useMock) return;
  try {
    const { graphGet, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("SchoolCertificates");
    // Find the item by FirestoreId
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, string> }> }>(
      `${listUrl}?$expand=fields&$filter=fields/FirestoreId eq '${firestoreId}'`
    );
    if (res.value.length > 0) {
      const spId = res.value[0].id;
      const fields: Record<string, string> = {};
      if (data.status) fields[CERT_COL.status] = data.status;
      if (data.revokedAt) fields[CERT_COL.revokedAt] = data.revokedAt;
      if (data.revocationReason) fields[CERT_COL.revocationReason] = data.revocationReason;
      if (data.revokedBy) fields[CERT_COL.revokedBy] = data.revokedBy;
      await graphPatch(`${listUrl}('${spId}')/fields`, fields);
    }
  } catch (err) {
    console.error("SharePoint certificate update failed (non-fatal):", err);
  }
}

/**
 * Fetch all certificates from SharePoint.
 */
export async function getSharePointCertificates(): Promise<SchoolCertificate[]> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
      const url = `${await getSiteListUrlAsync("SchoolCertificates")}?$expand=fields&$orderby=fields/CreatedAt desc&$top=500`;
      const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(url);
      return res.value.map((item) => mapSpCertToLocal(item.fields));
    },
    () => []
  );
}

/**
 * Search for a certificate by verification code or certificate number in SharePoint.
 * Inputs are escaped for OData. Caller-supplied values must already be format-validated.
 */
export async function findSharePointCertificate(codeOrNumber: string): Promise<SchoolCertificate | null> {
  return runSafe(
    async () => {
      const { graphGet, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
      const listUrl = await getSiteListUrlAsync("SchoolCertificates");
      const safe = escapeOData(codeOrNumber);
      let res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(
        `${listUrl}?$expand=fields&$filter=fields/VerificationCode eq '${safe}'&$top=1`
      );
      if (res.value.length === 0) {
        res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(
          `${listUrl}?$expand=fields&$filter=fields/CertificateNumber eq '${safe}'&$top=1`
        );
      }
      return res.value.length > 0 ? mapSpCertToLocal(res.value[0].fields) : null;
    },
    () => null
  );
}

/**
 * Delete a certificate from SharePoint by its Firestore ID.
 */
export async function deleteCertificateFromSharePoint(firestoreId: string): Promise<void> {
  if (useMock) return;
  try {
    const { graphGet, graphDelete, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("SchoolCertificates");
    const res = await graphGet<{ value: Array<{ id: string; fields: Record<string, string> }> }>(
      `${listUrl}?$expand=fields&$filter=fields/FirestoreId eq '${escapeOData(firestoreId)}'`
    );
    if (res.value.length > 0) {
      await graphDelete(`${listUrl}('${res.value[0].id}')`);
    }
  } catch (err) {
    console.error("SharePoint certificate delete failed (non-fatal):", err);
  }
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
  if (useMock) return null;
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
  if (useMock) return;
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
      await graphPatch(`${listUrl}/items/${existing}/fields`, fields);
    } else {
      await graphPost(listUrl, { fields });
    }
  } catch (err) {
    console.error("upsertCareerProfile failed:", err);
  }
}
