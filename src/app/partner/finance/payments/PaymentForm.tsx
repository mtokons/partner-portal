"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CreditCard, CheckCircle2 } from "lucide-react";
import { recordPayment } from "./actions";

export default function PaymentForm({ totalPayable }: { totalPayable: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("bank-transfer");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!reference.trim()) { setError("Please enter a payment reference."); return; }
    setSubmitting(true); setError("");
    try {
      await recordPayment({ amount: parseFloat(amount), reference: reference.trim(), method, notes: notes || undefined });
      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to record payment"); }
    finally { setSubmitting(false); }
  }

  if (success) {
    return (
      <div className="bg-card border rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">Payment Recorded Successfully</h3>
        <p className="text-sm text-muted-foreground mt-1">€{parseFloat(amount).toFixed(2)} — will be verified by SCCG.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" /> Record a Payment
        </h2>
        {totalPayable > 0 && (
          <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-semibold">
            Payable: €{totalPayable.toFixed(2)}
          </span>
        )}
      </div>
      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount (€) *</label>
          <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Payment Reference *</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank transfer ref or transaction ID"
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="bank-transfer">Bank Transfer</option>
            <option value="paypal">PayPal</option>
            <option value="wise">Wise</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..."
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        <Send className="w-4 h-4" />{submitting ? "Recording..." : "Record Payment"}
      </button>
      <div className="bg-muted/30 border rounded-xl p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground text-sm mb-1.5">SCCG Bank Details</p>
        <p>Bank: Sparkasse Deutschland · IBAN: DE89 3704 0044 0532 0130 00 · BIC: COBADEFFXXX</p>
      </div>
    </div>
  );
}
