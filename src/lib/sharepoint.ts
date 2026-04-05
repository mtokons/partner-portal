import type {
  Partner, Product, Order, Client, Activity, Financial,
  Installment, Transaction, Expense, Invoice,
  Customer, Expert, ServicePackage, CustomerPackage,
  Session, ExpertPayment, AppNotification,
} from "@/types";
import {
  mockPartners, mockProducts, mockOrders, mockClients,
  mockActivities, mockFinancials, mockInstallments,
  mockTransactions, mockExpenses, mockInvoices,
  mockCustomers, mockExperts, mockServicePackages,
  mockCustomerPackages, mockSessions,
  mockExpertPayments, mockNotifications,
} from "@/lib/mock-data";

const useMock = process.env.USE_MOCK_DATA === "true";

// ============================================================
// In-memory mutable stores (for demo CRUD without SharePoint)
// ============================================================
const stores = {
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
};

function genId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}`;
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
  if (useMock) return stores.partners;
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Partners")}?$expand=fields`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: f.id, name: f.Name, email: f.Email, passwordHash: f.PasswordHash, role: f.Role, status: f.Status, company: f.Company, createdAt: f.CreatedAt } as Partner;
  });
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
  if (useMock) return stores.products;
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  const url = `${await getSiteListUrlAsync("Products")}?$expand=fields`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string | number> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), name: String(f.Name), description: String(f.Description), price: Number(f.Price), stock: Number(f.Stock), category: String(f.Category), imageUrl: String(f.ImageUrl || "") } as Product;
  });
}

// ============================================================
// Orders
// ============================================================
export async function getOrders(partnerId?: string): Promise<Order[]> {
  if (useMock) {
    return partnerId ? stores.orders.filter((o) => o.partnerId === partnerId) : stores.orders;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Orders")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), partnerId: String(f.PartnerId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), items: JSON.parse(String(f.Items || "[]")), status: String(f.Status), totalAmount: Number(f.TotalAmount), createdAt: String(f.CreatedAt) } as Order;
  });
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
  if (useMock) {
    return partnerId ? stores.financials.filter((f) => f.partnerId === partnerId) : stores.financials;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Financials")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, string | number> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), partnerId: String(f.PartnerId), period: String(f.Period), revenue: Number(f.Revenue), outstanding: Number(f.Outstanding), paid: Number(f.Paid), createdAt: String(f.CreatedAt) } as Financial;
  });
}

// ============================================================
// Installments
// ============================================================
export async function getInstallments(partnerId?: string): Promise<Installment[]> {
  if (useMock) {
    return partnerId ? stores.installments.filter((i) => i.partnerId === partnerId) : stores.installments;
  }
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
  let url = `${await getSiteListUrlAsync("Installments")}?$expand=fields`;
  if (partnerId) url += `&$filter=fields/PartnerId eq '${partnerId}'`;
  const res = await graphGet<{ value: Array<{ fields: Record<string, unknown> }> }>(url);
  return res.value.map((item) => {
    const f = item.fields;
    return { id: String(f.id), orderId: String(f.OrderId), clientId: String(f.ClientId), clientName: String(f.ClientName || ""), partnerId: String(f.PartnerId), installmentNumber: Number(f.InstallmentNumber), totalInstallments: Number(f.TotalInstallments), amount: Number(f.Amount), amountEur: f.AmountEUR ? Number(f.AmountEUR) : undefined, conversionRate: f.ConversionRate ? Number(f.ConversionRate) : undefined, dueDate: String(f.DueDate), paidDate: f.PaidDate ? String(f.PaidDate) : undefined, status: String(f.Status), notes: f.Notes ? String(f.Notes) : undefined } as Installment;
  });
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

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  if (useMock) return stores.customers.find((c) => c.email === email) || null;
  return null;
}

export async function createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
  const newCustomer = { ...customer, id: genId("cust") } as Customer;
  if (useMock) { stores.customers.push(newCustomer); return newCustomer; }
  return newCustomer;
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
  return null;
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
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  if (useMock) return stores.notifications.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (useMock) { const n = stores.notifications.find((x) => x.id === id); if (n) n.read = true; }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (useMock) { stores.notifications.filter((n) => n.userId === userId).forEach((n) => { n.read = true; }); }
}

export async function createNotification(notification: Omit<AppNotification, "id">): Promise<AppNotification> {
  const newNotif = { ...notification, id: genId("notif") } as AppNotification;
  if (useMock) { stores.notifications.unshift(newNotif); }
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
