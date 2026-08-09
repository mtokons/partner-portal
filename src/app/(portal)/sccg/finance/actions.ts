"use server";

import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import { Repository } from "@/lib/repository";
import { createExpense, createNotification, createTransaction, getCandidates, getCustomers, getExpenses, getFinancials, getPartners, getTransactions } from "@/lib/sharepoint";
import type { ExpertPayment, Transaction } from "@/types";

export interface FinanceSummary {
  sccgRevenue: number;
  partnerRevenue: number;
  paid: number;
  outstanding: number;
  expenses: number;
  refundTotal: number;
  partnerCount: number;
  customerCount: number;
}

export async function fetchFinanceSummaryAction(): Promise<{ success: boolean; data?: FinanceSummary; error?: string }> {
  try {
    await requirePermission("payment.view");
    const [financials, transactions, partners, customers, candidates, expenses] = await Promise.all([
      getFinancials(), getTransactions(), getPartners(), getCustomers(), getCandidates(), getExpenses(),
    ]);
    const paid = financials.reduce((total, item) => total + item.paid, 0);
    const outstanding = financials.reduce((total, item) => total + item.outstanding, 0);
    const refundTotal = transactions.filter((item) => item.type === "refund").reduce((total, item) => total + item.amount, 0);
    const partnerRevenue = candidates.reduce((total, item) => total + (item.partnerShare || 0), 0);
    const sccgRevenue = candidates.reduce((total, item) => total + (item.sccgShare || 0), 0);
    return {
      success: true,
      data: {
        sccgRevenue,
        partnerRevenue,
        paid,
        outstanding,
        expenses: expenses.reduce((total, item) => total + (item.amountEur ?? item.amount), 0),
        refundTotal,
        partnerCount: partners.length,
        customerCount: customers.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load finance overview" };
  }
}

export async function fetchExpertPaymentsAction(): Promise<{ success: boolean; data?: ExpertPayment[]; error?: string }> {
  try {
    await requirePermission("expert-payment.manage");
    return { success: true, data: await Repository.expertPayments.getAll() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load expert payments" };
  }
}

export async function approveExpertPaymentAction(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("expert-payment.manage");
    const payment = (await Repository.expertPayments.getAll()).find((item) => item.id === paymentId);
    if (!payment) return { success: false, error: "Expert payment not found" };
    await Repository.expertPayments.approve(paymentId, user.id);
    await createNotification({ userId: payment.expertId, userType: "expert", type: "payment_approved", title: "Payment approved", message: `Your ${payment.currency} ${payment.amount.toFixed(2)} payment has been approved.`, read: false, relatedId: paymentId, createdAt: new Date().toISOString() });
    await writeAuditLog({ action: "expert_payment.approve", actorId: user.id, actorEmail: user.email, targetId: paymentId, targetType: "expertPayment" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve expert payment" };
  }
}

export async function markExpertPaymentPaidAction(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("expert-payment.manage");
    const payment = (await Repository.expertPayments.getAll()).find((item) => item.id === paymentId);
    if (!payment) return { success: false, error: "Expert payment not found" };
    await Repository.expertPayments.markPaid(paymentId);
    await createNotification({ userId: payment.expertId, userType: "expert", type: "payment_received", title: "Payment sent", message: `Your ${payment.currency} ${payment.amount.toFixed(2)} payment has been marked paid.`, read: false, relatedId: paymentId, createdAt: new Date().toISOString() });
    await writeAuditLog({ action: "expert_payment.mark_paid", actorId: user.id, actorEmail: user.email, targetId: paymentId, targetType: "expertPayment" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark expert payment paid" };
  }
}

export async function fetchRefundRequestsAction(): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
  try {
    await requirePermission("payment.refund");
    const transactions = await getTransactions();
    return { success: true, data: transactions.filter((transaction) => transaction.type === "refund-request" || transaction.type === "refund") };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load refunds" };
  }
}

export async function issueRefundAction(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("payment.refund");
    const transactions = await getTransactions();
    const request = transactions.find((transaction) => transaction.id === requestId);
    if (!request) return { success: false, error: "Refund request not found" };
    if (request.type !== "refund-request" || request.amount <= 0) return { success: false, error: "Invalid refund request" };
    if (transactions.some((transaction) => transaction.type === "refund" && transaction.reference.startsWith(`REFUND-${request.id}-`))) {
      return { success: false, error: "This refund request has already been issued" };
    }
    await createTransaction({
      clientId: request.clientId,
      partnerId: request.partnerId,
      type: "refund",
      amount: request.amount,
      reference: `REFUND-${request.id}-${Date.now()}`,
      orderId: request.orderId,
      description: `Issued against request ${request.reference}. ${request.description || ""}`.trim(),
      date: new Date().toISOString(),
    });
    await createNotification({ userId: request.clientId, userType: "customer", type: "payment_received", title: "Refund issued", message: `A refund of EUR ${request.amount.toFixed(2)} has been issued for ${request.reference}.`, read: false, relatedId: request.id, createdAt: new Date().toISOString() });
    await writeAuditLog({ action: "payment.refund", actorId: user.id, actorEmail: user.email, targetId: request.id, targetType: "refundRequest", metadata: { amount: request.amount, reference: request.reference } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to issue refund" };
  }
}

export interface PartnerPerformanceRow {
  partnerId: string;
  partnerName: string;
  revenue: number;
  paid: number;
  outstanding: number;
  refundTotal: number;
}

export async function fetchPartnerPerformanceAction(): Promise<{ success: boolean; data?: PartnerPerformanceRow[]; error?: string }> {
  try {
    await requirePermission("partner.performance.view");
    const [partners, financials, transactions] = await Promise.all([getPartners(), getFinancials(), getTransactions()]);
    const rows = partners.map((partner) => {
      const partnerFinancials = financials.filter((item) => item.partnerId === partner.id);
      const partnerTransactions = transactions.filter((item) => item.partnerId === partner.id && item.type === "refund");
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        revenue: partnerFinancials.reduce((total, item) => total + item.revenue, 0),
        paid: partnerFinancials.reduce((total, item) => total + item.paid, 0),
        outstanding: partnerFinancials.reduce((total, item) => total + item.outstanding, 0),
        refundTotal: partnerTransactions.reduce((total, item) => total + item.amount, 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load partner performance" };
  }
}

export async function createSccgExpenseAction(formData: FormData): Promise<void> {
  const user = await requirePermission("payment.record");
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date") || "").trim();
  if (!category || !description || !date || !Number.isFinite(amount) || amount <= 0) throw new Error("Valid expense details are required");
  const expense = await createExpense({ partnerId: "SCCG-DIRECT", category, amount, amountEur: amount, conversionRate: 1, description, date, isOnHold: false });
  await writeAuditLog({ action: "finance.expense.create", actorId: user.id, actorEmail: user.email, targetId: expense.id, targetType: "expense", metadata: { amount, category } });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/sccg/finance"); revalidatePath("/sccg/finance/expenses");
}

export async function revalidateFinanceViewsAction(): Promise<{ success: boolean }> {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/sccg/finance");
    revalidatePath("/sccg/finance/invoices");
    revalidatePath("/sccg/finance/payments");
    revalidatePath("/sccg/finance/payouts");
    revalidatePath("/sccg/expert-payments");
    revalidatePath("/sccg/refunds");
    revalidatePath("/sccg/finance/expenses");
    revalidatePath("/sccg/finance/reports");
    revalidatePath("/sccg/partner-performance");
    return { success: true };
  } catch (err: any) {
    return { success: false };
  }
}