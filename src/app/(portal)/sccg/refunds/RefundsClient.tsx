"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Search } from "lucide-react";
import type { Transaction } from "@/types";
import { issueRefundAction } from "../finance/actions";

export default function RefundsClient({ transactions: initialTransactions }: { transactions: Transaction[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const issuedForRequest = new Set(transactions.filter((item) => item.type === "refund").map((item) => item.description?.match(/request ([^\.]+)/)?.[1]).filter(Boolean));
  const filtered = useMemo(() => transactions.filter((item) => `${item.reference} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase())), [transactions, query]);

  function issue(request: Transaction) {
    startTransition(async () => {
      const result = await issueRefundAction(request.id);
      if (!result.success) { setNotice(result.error || "Refund could not be issued."); return; }
      setTransactions((current) => [...current, { ...request, id: `local-${request.id}`, type: "refund", reference: `REFUND-${request.id}`, description: `Issued against request ${request.reference}.`, date: new Date().toISOString() }]);
      setNotice("Refund recorded in the transaction ledger.");
    });
  }

  return <div className="space-y-4">
    {notice && <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">{notice}</div>}
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference or reason..." className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm" /></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="p-3">Reference</th><th className="p-3">Partner</th><th className="p-3">Amount</th><th className="p-3">Reason</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{filtered.map((item) => { const issued = issuedForRequest.has(item.reference); return <tr key={item.id} className="border-t border-border/60"><td className="p-3 font-mono text-xs">{item.reference}</td><td className="p-3">{item.partnerId || "—"}</td><td className="p-3">EUR {item.amount.toFixed(2)}</td><td className="p-3 max-w-sm text-muted-foreground">{item.description || "—"}</td><td className="p-3">{new Date(item.date).toLocaleDateString("en-GB")}</td><td className="p-3"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${item.type === "refund" || issued ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.type === "refund" || issued ? "issued" : "requested"}</span></td><td className="p-3">{item.type === "refund-request" && !issued && <button disabled={pending} onClick={() => issue(item)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-3 w-3" />Issue refund</button>}</td></tr>; })}{filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No refund records found.</td></tr>}</tbody></table></div>
  </div>;
}