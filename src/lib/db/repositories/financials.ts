/**
 * Financials Repository — Invoices, Installments, Expenses
 */
import { getDb } from "../firestore";
import type { Invoice, Installment, Expense, DashboardKPIs } from "@/types";

function now() {
  return new Date().toISOString();
}

// ── Invoices ──

export async function getInvoices(partnerId?: string): Promise<Invoice[]> {
  let q: FirebaseFirestore.Query = getDb().collection("invoices").orderBy("createdAt", "desc");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice);
}

export async function createInvoice(
  data: Omit<Invoice, "id" | "createdAt" | "updatedAt">
): Promise<Invoice> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection("invoices").add(doc);
  return { id: ref.id, ...doc } as Invoice;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
  await getDb().collection("invoices").doc(id).update({ ...data, updatedAt: now() });
}

// ── Installments ──

export async function getInstallments(partnerId?: string): Promise<Installment[]> {
  let q: FirebaseFirestore.Query = getDb().collection("installments").orderBy("dueDate");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Installment);
}

export async function createInstallment(
  data: Omit<Installment, "id" | "createdAt">
): Promise<Installment> {
  const doc = { ...data, createdAt: now() };
  const ref = await getDb().collection("installments").add(doc);
  return { id: ref.id, ...doc } as Installment;
}

// ── Expenses ──

export async function getExpenses(partnerId?: string): Promise<Expense[]> {
  let q: FirebaseFirestore.Query = getDb().collection("expenses").orderBy("date", "desc");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
}

export async function createExpense(
  data: Omit<Expense, "id" | "createdAt">
): Promise<Expense> {
  const doc = { ...data, createdAt: now() };
  const ref = await getDb().collection("expenses").add(doc);
  return { id: ref.id, ...doc } as Expense;
}

// ── Dashboard KPIs ──

export async function getDashboardKPIs(partnerId?: string): Promise<DashboardKPIs> {
  const [orders, clients, invoices, installments] = await Promise.all([
    (async () => {
      let q: FirebaseFirestore.Query = getDb().collection("salesOrders");
      if (partnerId) q = q.where("partnerId", "==", partnerId);
      return (await q.get()).docs.map((d) => d.data());
    })(),
    (async () => {
      let q: FirebaseFirestore.Query = getDb().collection("clients");
      if (partnerId) q = q.where("partnerId", "==", partnerId);
      return (await q.get()).size;
    })(),
    getInvoices(partnerId),
    getInstallments(partnerId),
  ]);

  const totalSales = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const overdueInstallments = installments.filter((i) => i.status === "overdue").length;
  const unpaidInvoices = invoices.filter((i) => i.status === "overdue" || i.status === "sent").length;

  return {
    totalSales,
    activeClients: clients,
    pendingOrders,
    totalRevenue,
    overdueInstallments,
    unpaidInvoices,
  };
}
