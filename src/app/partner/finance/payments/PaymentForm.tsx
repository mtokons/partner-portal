"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Building2, Smartphone } from "lucide-react";
import { recordPayment } from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────
type Method = "bkash" | "nagad" | "bank-transfer" | "other";

interface Props {
  totalPayable: number;
  bdtRate: number;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  sccgBkashNumber?: string;
  sccgNagadNumber?: string;
  cityBankAccount?: string;
  cityBankName?: string;
  cityBankBranch?: string;
  cityBankRoutingNo?: string;
  cityBankSwift?: string;
}

// ─── Method card data ────────────────────────────────────────────────────────
const METHODS = [
  {
    id: "bkash" as Method,
    label: "bKash",
    initials: "bK",
    color: "border-[#e2136e]/30 bg-[#e2136e]/5 hover:border-[#e2136e]/60 hover:bg-[#e2136e]/10",
    activeColor: "border-[#e2136e] bg-[#e2136e]/10 ring-2 ring-[#e2136e]/20",
    iconBg: "bg-[#e2136e]",
    textColor: "text-[#e2136e]",
  },
  {
    id: "nagad" as Method,
    label: "Nagad",
    initials: "Na",
    color: "border-orange-400/30 bg-orange-50/30 hover:border-orange-400/60 hover:bg-orange-50/60 dark:bg-orange-950/10",
    activeColor: "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 dark:bg-orange-950/20",
    iconBg: "bg-orange-500",
    textColor: "text-orange-600",
  },
  {
    id: "bank-transfer" as Method,
    label: "City Bank",
    initials: "CB",
    color: "border-sky-400/30 bg-sky-50/30 hover:border-sky-400/60 hover:bg-sky-50/60 dark:bg-sky-950/10",
    activeColor: "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 dark:bg-sky-950/20",
    iconBg: "bg-sky-600",
    textColor: "text-sky-600",
  },
  {
    id: "other" as Method,
    label: "Other",
    initials: "€",
    color: "border-muted-foreground/20 hover:border-muted-foreground/40",
    activeColor: "border-primary bg-primary/5 ring-2 ring-primary/20",
    iconBg: "bg-muted-foreground",
    textColor: "text-muted-foreground",
  },
] as const;

export default function PaymentForm({
  totalPayable,
  bdtRate,
  bkashEnabled,
  nagadEnabled,
  sccgBkashNumber,
  sccgNagadNumber,
  cityBankAccount,
  cityBankName,
  cityBankBranch,
  cityBankRoutingNo,
  cityBankSwift,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("bkash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const bdtPayable = totalPayable * bdtRate;
  const selected = METHODS.find((m) => m.id === method)!;
  const isBdtMethod = method === "bkash" || method === "nagad" || method === "bank-transfer";

  async function handleGatewayPay(gateway: "bkash" | "nagad") {
    const bdtAmt = parseFloat(amount);
    if (!bdtAmt || bdtAmt <= 0) { setError("Enter a valid BDT amount."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/payment/${gateway}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: bdtAmt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gateway error");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to gateway.");
      setSubmitting(false);
    }
  }

  async function handleManualSubmit() {
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!reference.trim()) { setError("Enter a transaction reference or TrxID."); return; }
    setSubmitting(true);
    setError("");
    try {
      const rawAmt = parseFloat(amount);
      const eurAmt = isBdtMethod && bdtRate > 0 ? rawAmt / bdtRate : rawAmt;
      await recordPayment({
        amount: Math.round(eurAmt * 100) / 100,
        reference: reference.trim(),
        method,
        notes: notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-card border rounded-2xl p-10 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">Payment Recorded</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {amount} {isBdtMethod ? "BDT" : "EUR"} via {selected.label} — SCCG will verify shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      {/* Method selector */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Select Payment Method</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setError(""); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer
                ${method === m.id ? m.activeColor : m.color}`}
            >
              <span className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center text-white text-sm font-bold shadow`}>
                {m.initials}
              </span>
              <span className={`text-xs font-semibold ${method === m.id ? m.textColor : "text-muted-foreground"}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* bKash */}
      {method === "bkash" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payable to SCCG</span>
            <span className="font-bold text-[#e2136e]">
              €{totalPayable.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground ml-1">(৳{bdtPayable.toLocaleString("en", { maximumFractionDigits: 0 })} BDT)</span>
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount in BDT (৳) *</label>
            <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={bdtPayable.toFixed(0)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e2136e]/30" />
          </div>
          {bkashEnabled ? (
            <button onClick={() => handleGatewayPay("bkash")} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#e2136e] text-white font-semibold text-sm hover:bg-[#c0115c] disabled:opacity-50 transition-colors">
              <Smartphone className="w-4 h-4" />
              {submitting ? "Connecting to bKash…" : "Pay with bKash"}
            </button>
          ) : (
            <>
              {sccgBkashNumber && (
                <div className="bg-[#e2136e]/5 border border-[#e2136e]/20 rounded-xl p-4 text-sm space-y-1">
                  <p className="font-semibold text-[#e2136e] text-xs uppercase tracking-wide mb-2">Send to SCCG bKash</p>
                  <p><span className="text-muted-foreground">Number: </span><span className="font-mono font-bold">{sccgBkashNumber}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">After sending, enter the TrxID below and click Record.</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">bKash TrxID *</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 8C1A2B3X4Y"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e2136e]/30" />
              </div>
              <button onClick={handleManualSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#e2136e] text-white font-semibold text-sm hover:bg-[#c0115c] disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
                {submitting ? "Recording…" : "Record bKash Payment"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Nagad */}
      {method === "nagad" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payable to SCCG</span>
            <span className="font-bold text-orange-600">
              €{totalPayable.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground ml-1">(৳{bdtPayable.toLocaleString("en", { maximumFractionDigits: 0 })} BDT)</span>
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount in BDT (৳) *</label>
            <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={bdtPayable.toFixed(0)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
          </div>
          {nagadEnabled ? (
            <button onClick={() => handleGatewayPay("nagad")} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors">
              <Smartphone className="w-4 h-4" />
              {submitting ? "Connecting to Nagad…" : "Pay with Nagad"}
            </button>
          ) : (
            <>
              {sccgNagadNumber && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-sm space-y-1">
                  <p className="font-semibold text-orange-600 text-xs uppercase tracking-wide mb-2">Send to SCCG Nagad</p>
                  <p><span className="text-muted-foreground">Number: </span><span className="font-mono font-bold">{sccgNagadNumber}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">After sending, enter the TrxID below and click Record.</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Nagad TrxID *</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. NRD2024012XXXXX"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
              <button onClick={handleManualSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
                {submitting ? "Recording…" : "Record Nagad Payment"}
              </button>
            </>
          )}
        </div>
      )}

      {/* City Bank Transfer */}
      {method === "bank-transfer" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payable to SCCG</span>
            <span className="font-bold text-sky-600">
              €{totalPayable.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-muted-foreground ml-1">(৳{bdtPayable.toLocaleString("en", { maximumFractionDigits: 0 })} BDT)</span>
            </span>
          </div>
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-sm space-y-1.5">
            <p className="font-semibold text-sky-600 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> The City Bank — Account Details
            </p>
            {cityBankName && <p><span className="text-muted-foreground w-28 inline-block">Account Name:</span> <span className="font-medium">{cityBankName}</span></p>}
            {cityBankAccount && <p><span className="text-muted-foreground w-28 inline-block">Account No:</span> <span className="font-mono font-bold">{cityBankAccount}</span></p>}
            {cityBankBranch && <p><span className="text-muted-foreground w-28 inline-block">Branch:</span> <span className="font-medium">{cityBankBranch}</span></p>}
            {cityBankRoutingNo && <p><span className="text-muted-foreground w-28 inline-block">Routing No:</span> <span className="font-mono">{cityBankRoutingNo}</span></p>}
            {cityBankSwift && <p><span className="text-muted-foreground w-28 inline-block">SWIFT / BIC:</span> <span className="font-mono font-bold">{cityBankSwift}</span></p>}
            <p className="text-xs text-muted-foreground pt-1">Transfer the BDT amount, then enter the bank reference below.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount in BDT (৳) *</label>
              <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={bdtPayable.toFixed(0)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Bank Reference / TxnID *</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="Bank transfer reference"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent from Standard Chartered BD"
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30" />
          </div>
          <button onClick={handleManualSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
            {submitting ? "Recording…" : "Record Bank Transfer"}
          </button>
        </div>
      )}

      {/* Other */}
      {method === "other" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount (€ EUR) *</label>
              <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Payment Reference *</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="Bank ref, TxnID, or receipt no."
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Details about the payment method used"
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={handleManualSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" />
            {submitting ? "Recording…" : "Record Payment"}
          </button>
        </div>
      )}
    </div>
  );
}
