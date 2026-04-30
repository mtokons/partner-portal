/**
 * Computed (virtual) tasks that aren't stored in the SharePoint Tasks list.
 * They are derived live from operational data so the team can act on real
 * business signals (overdue installments, pending offers, expert payouts
 * awaiting approval, expiring SCCG cards, students eligible for certificates).
 */

import {
  getInstallments,
  getInvoices,
  getSalesOffers,
  getExpertPayments,
  getGiftCards,
} from "@/lib/sharepoint";

export type ComputedTaskSeverity = "low" | "medium" | "high" | "critical";

export interface ComputedTask {
  id: string;
  source:
    | "overdue-installment"
    | "unpaid-invoice"
    | "pending-offer"
    | "eligible-expert-payment"
    | "expiring-card";
  title: string;
  detail: string;
  severity: ComputedTaskSeverity;
  href: string;
  due?: string;
  amount?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

export async function getComputedTasks(): Promise<ComputedTask[]> {
  const [installments, invoices, offers, payments, cards] = await Promise.all([
    getInstallments().catch(() => []),
    getInvoices().catch(() => []),
    getSalesOffers().catch(() => []),
    getExpertPayments().catch(() => []),
    getGiftCards().catch(() => []),
  ]);

  const now = new Date();
  const tasks: ComputedTask[] = [];

  // Overdue installments
  for (const inst of installments) {
    if (inst.status !== "overdue") continue;
    const due = inst.dueDate ? new Date(inst.dueDate) : null;
    const lateDays = due ? Math.max(0, daysBetween(now, due)) : 0;
    tasks.push({
      id: `inst-${inst.id}`,
      source: "overdue-installment",
      title: `Overdue installment · BDT ${Math.round(inst.amount).toLocaleString()}`,
      detail: `Order ${inst.orderId || "?"} — ${lateDays} day${lateDays === 1 ? "" : "s"} late`,
      severity: lateDays > 14 ? "critical" : lateDays > 3 ? "high" : "medium",
      href: `/financials`,
      due: inst.dueDate,
      amount: inst.amount,
    });
  }

  // Unpaid (sent) invoices nearing due
  for (const inv of invoices) {
    if (inv.status !== "sent" && inv.status !== "overdue") continue;
    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    const daysToDue = due ? daysBetween(due, now) : null;
    if (inv.status === "overdue" || (daysToDue !== null && daysToDue <= 7)) {
      tasks.push({
        id: `inv-${inv.id}`,
        source: "unpaid-invoice",
        title: `${inv.status === "overdue" ? "Overdue" : "Due soon"} invoice ${inv.id}`,
        detail: `Client: ${inv.clientName || inv.clientId || "?"} · BDT ${Math.round(inv.amount || 0).toLocaleString()}`,
        severity: inv.status === "overdue" ? "high" : "medium",
        href: `/financials?tab=invoices`,
        due: inv.dueDate,
        amount: inv.amount,
      });
    }
  }

  // Pending sales offers awaiting customer response
  for (const offer of offers) {
    if (offer.status !== "sent") continue;
    const sent = offer.sentAt ? new Date(offer.sentAt) : offer.createdAt ? new Date(offer.createdAt) : null;
    const ageDays = sent ? daysBetween(now, sent) : 0;
    if (ageDays < 2) continue; // give customers time
    tasks.push({
      id: `offer-${offer.id}`,
      source: "pending-offer",
      title: `Follow up on offer ${offer.offerNumber || offer.id}`,
      detail: `${offer.clientName || "Client"} · sent ${ageDays} day${ageDays === 1 ? "" : "s"} ago`,
      severity: ageDays > 14 ? "high" : "medium",
      href: `/sales`,
      amount: offer.totalAmount,
    });
  }

  // Expert payments awaiting approval (eligible)
  for (const p of payments) {
    if (p.status !== "eligible") continue;
    tasks.push({
      id: `paye-${p.id}`,
      source: "eligible-expert-payment",
      title: `Approve expert payout · BDT ${Math.round(p.amount).toLocaleString()}`,
      detail: `${p.expertName || p.expertId} · session ${p.sessionId}`,
      severity: "medium",
      href: `/admin/payouts`,
      amount: p.amount,
    });
  }

  // SCCG cards expiring within 30 days
  for (const c of cards) {
    if (c.status !== "active" || !c.expiresAt) continue;
    const expiry = new Date(c.expiresAt);
    const daysLeft = daysBetween(expiry, now);
    if (daysLeft < 0 || daysLeft > 30) continue;
    tasks.push({
      id: `card-${c.id}`,
      source: "expiring-card",
      title: `SCCG card expiring · ${c.cardNumber || c.sccgId || c.id}`,
      detail: `${c.issuedToName || "Holder"} · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      severity: daysLeft <= 7 ? "high" : "low",
      href: `/admin/sccg-cards`,
      due: c.expiresAt,
    });
  }

  // Sort: critical → high → medium → low, then by due date
  const order: Record<ComputedTaskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => {
    const s = order[a.severity] - order[b.severity];
    if (s !== 0) return s;
    const ad = a.due ? new Date(a.due).getTime() : Infinity;
    const bd = b.due ? new Date(b.due).getTime() : Infinity;
    return ad - bd;
  });

  return tasks;
}
