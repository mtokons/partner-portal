"use server";

import {
  getPayments,
  getEnhancedInvoices,
  getEnhancedInstallments,
  getSccgCards,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";

export async function fetchFinanceSummary() {
  await requirePermission("payment.view");

  const [payments, invoices, installments, cards] = await Promise.all([
    getPayments(),
    getEnhancedInvoices(),
    getEnhancedInstallments(),
    getSccgCards(),
  ]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const completedPayments = payments.filter((p) => p.status === "verified");
  const totalReceived = completedPayments.reduce((s, p) => s + p.amount, 0);
  const monthPayments = completedPayments.filter((p) => (p.verifiedAt || "").startsWith(thisMonth));
  const monthReceived = monthPayments.reduce((s, p) => s + p.amount, 0);

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");

  const totalInstallments = installments.length;
  const paidInstallments = installments.filter((i) => i.status === "paid");
  const overdueInstallments = installments.filter((i) => i.status === "overdue");

  const activeCards = cards.filter((c) => c.status === "active");
  const totalCardBalance = cards.reduce((s, c) => s + c.balance, 0);

  // Payment methods breakdown
  const methodBreakdown: Record<string, number> = {};
  completedPayments.forEach((p) => {
    methodBreakdown[p.paymentMethod] = (methodBreakdown[p.paymentMethod] || 0) + p.amount;
  });

  // Monthly trend (last 6 months)
  const monthlyTrend: Array<{ month: string; amount: number; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthP = completedPayments.filter((p) => (p.verifiedAt || "").startsWith(prefix));
    monthlyTrend.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      amount: monthP.reduce((s, p) => s + p.amount, 0),
      count: monthP.length,
    });
  }

  return {
    totalReceived,
    monthReceived,
    totalBilled,
    paidInvoiceCount: paidInvoices.length,
    overdueInvoiceCount: overdueInvoices.length,
    totalInvoiceCount: invoices.length,
    totalInstallments,
    paidInstallmentCount: paidInstallments.length,
    overdueInstallmentCount: overdueInstallments.length,
    activeCardCount: activeCards.length,
    totalCardBalance,
    totalCardCount: cards.length,
    methodBreakdown,
    monthlyTrend,
    totalPaymentCount: payments.length,
  };
}
