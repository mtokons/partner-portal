"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search, WalletCards } from "lucide-react";
import type { ExpertPayment } from "@/types";
import { approveExpertPaymentAction, markExpertPaymentPaidAction } from "../finance/actions";

const STATUS_STYLE: Record<ExpertPayment["status"], string> = {
  pending: "bg-gray-100 text-gray-700", eligible: "bg-amber-100 text-amber-800", approved: "bg-blue-100 text-blue-800", paid: "bg-emerald-100 text-emerald-800", disputed: "bg-red-100 text-red-800",
};

export default function ExpertPaymentsClient({ payments: initialPayments }: { payments: ExpertPayment[] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string>("");
  const filtered = useMemo(() => payments.filter((payment) => `${payment.expertName || ""} ${payment.customerName || ""}`.toLowerCase().includes(query.toLowerCase())), [payments, query]);
  const total = filtered.reduce((sum, payment) => sum + payment.amount, 0);

  function update(payment: ExpertPayment, action: "approve" | "paid") {
    startTransition(async () => {
      const result = action === "approve" ? await approveExpertPaymentAction(payment.id) : await markExpertPaymentPaidAction(payment.id);
      if (!result.success) { setNotice(result.error || "Payment update failed."); return; }
      setPayments((current) => current.map((item) => item.id === payment.id ? { ...item, status: action === "approve" ? "approved" : "paid" } : item));
      setNotice(action === "approve" ? "Payment approved." : "Payment marked paid.");
    });
  }

  return <div className="space-y-4">
    {notice && <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Visible payments</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Value</p><p className="mt-1 text-2xl font-bold">EUR {total.toFixed(2)}</p></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Awaiting action</p><p className="mt-1 text-2xl font-bold">{filtered.filter((item) => item.status === "eligible" || item.status === "approved").length}</p></div>
    </div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expert or customer..." className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm" /></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="p-3">Expert</th><th className="p-3">Customer</th><th className="p-3">Session</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{filtered.map((payment) => <tr key={payment.id} className="border-t border-border/60"><td className="p-3 font-medium">{payment.expertName || payment.expertId}</td><td className="p-3">{payment.customerName || "—"}</td><td className="p-3">{payment.sessionId}</td><td className="p-3">{payment.currency} {payment.amount.toFixed(2)}</td><td className="p-3"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLE[payment.status]}`}>{payment.status}</span></td><td className="p-3">{payment.status === "eligible" && <button disabled={pending} onClick={() => update(payment, "approve")} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"><Check className="h-3 w-3" />Approve</button>}{payment.status === "approved" && <button disabled={pending} onClick={() => update(payment, "paid")} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-50"><WalletCards className="h-3 w-3" />Mark paid</button>}</td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No expert payments found.</td></tr>}</tbody></table></div>
  </div>;
}