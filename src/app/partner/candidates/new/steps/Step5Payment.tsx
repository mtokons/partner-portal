"use client";

import { useState } from "react";
import { Clock, CreditCard, Smartphone, Landmark, Banknote, ChevronRight, Info, CheckCircle2 } from "lucide-react";
import type { WizardState } from "../WizardShell";
import type { PartnerPaymentData } from "@/app/partner/settings/actions";

interface Step5PaymentProps {
  depositAmount: number;
  onNext: (data: Pick<WizardState, "paymentOption" | "paymentMethod" | "paymentReference">) => void;
  onBack: () => void;
  secondaryCurrency?: string;
  exchangeRate?: number;
  partnerPaymentInfo?: PartnerPaymentData;
}

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

type PayMethod = "bkash" | "nagad" | "cash" | "bank";

const METHODS: { id: PayMethod; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: "bkash",  label: "bKash",       icon: Smartphone, color: "text-[#D12053]", bg: "bg-[#D12053]/10" },
  { id: "nagad",  label: "Nagad",       icon: Smartphone, color: "text-[#F7941D]", bg: "bg-[#F7941D]/10" },
  { id: "cash",   label: "Cash",        icon: Banknote,   color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { id: "bank",   label: "Bank Transfer", icon: Landmark, color: "text-blue-600",   bg: "bg-blue-500/10" },
];

export function Step5Payment({
  depositAmount,
  onNext,
  onBack,
  secondaryCurrency = "EUR",
  exchangeRate = 1,
  partnerPaymentInfo,
}: Step5PaymentProps) {
  const [mode, setMode] = useState<"pay-later" | "select-method">("pay-later");
  const [selectedMethod, setSelectedMethod] = useState<PayMethod | null>(null);
  const [reference, setReference] = useState("");

  const showSec = secondaryCurrency !== "EUR" && exchangeRate > 1;
  const secSym = CSYM[secondaryCurrency] || secondaryCurrency;
  const secAmount = Math.round(depositAmount * exchangeRate);

  /** Build the details block for the selected method */
  function renderDetails(method: PayMethod) {
    const rows: { label: string; value: string }[] = [];

    if (method === "bkash") {
      if (partnerPaymentInfo?.bkashNumber) rows.push({ label: "bKash Number", value: partnerPaymentInfo.bkashNumber });
      if (partnerPaymentInfo?.accountHolderName) rows.push({ label: "Account Name", value: partnerPaymentInfo.accountHolderName });
      if (rows.length === 0) rows.push({ label: "Note", value: "Your partner's bKash number will be shared separately." });
    } else if (method === "nagad") {
      if (partnerPaymentInfo?.nagadNumber) rows.push({ label: "Nagad Number", value: partnerPaymentInfo.nagadNumber });
      if (partnerPaymentInfo?.accountHolderName) rows.push({ label: "Account Name", value: partnerPaymentInfo.accountHolderName });
      if (rows.length === 0) rows.push({ label: "Note", value: "Your partner's Nagad number will be shared separately." });
    } else if (method === "cash") {
      rows.push({ label: "Method", value: "Cash payment directly to the partner" });
      if (partnerPaymentInfo?.accountHolderName) rows.push({ label: "Recipient", value: partnerPaymentInfo.accountHolderName });
      if (partnerPaymentInfo?.paymentNote) rows.push({ label: "Instructions", value: partnerPaymentInfo.paymentNote });
    } else if (method === "bank") {
      if (partnerPaymentInfo?.bankName) rows.push({ label: "Bank Name", value: partnerPaymentInfo.bankName });
      if (partnerPaymentInfo?.accountHolderName) rows.push({ label: "Account Name", value: partnerPaymentInfo.accountHolderName });
      if (partnerPaymentInfo?.accountNumber) rows.push({ label: "Account No.", value: partnerPaymentInfo.accountNumber });
      if (partnerPaymentInfo?.iban) rows.push({ label: "IBAN", value: partnerPaymentInfo.iban });
      if (partnerPaymentInfo?.bic) rows.push({ label: "BIC / SWIFT", value: partnerPaymentInfo.bic });
      if (partnerPaymentInfo?.paymentNote) rows.push({ label: "Instructions", value: partnerPaymentInfo.paymentNote });
      if (rows.length === 0) rows.push({ label: "Note", value: "Your partner's bank details will be shared separately." });
    }

    return (
      <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Payment Details</p>
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">{r.label}</span>
            <span className="font-medium text-right break-all">{r.value}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 text-sm pt-2 border-t mt-2">
          <span className="text-muted-foreground shrink-0">Amount Due</span>
          <span className="font-bold text-foreground">
            €{depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            {showSec && <span className="text-muted-foreground font-normal ml-1">(≈ {secSym}{secAmount.toLocaleString()})</span>}
          </span>
        </div>
      </div>
    );
  }

  function handleContinue() {
    if (mode === "pay-later") {
      onNext({ paymentOption: "pay-later", paymentMethod: undefined, paymentReference: undefined });
    } else {
      onNext({
        paymentOption: "pay-now",
        paymentMethod: selectedMethod ?? undefined,
        paymentReference: reference.trim() || undefined,
      });
    }
  }

  const canContinue = mode === "pay-later" || (mode === "select-method" && selectedMethod !== null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Payment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deposit required:{" "}
          <strong>€{depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
          {showSec && <span className="text-muted-foreground"> (≈ {secSym}{secAmount.toLocaleString()})</span>}
        </p>
      </div>

      {/* Primary mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => { setMode("pay-later"); setSelectedMethod(null); setReference(""); }}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
            mode === "pay-later" ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
          }`}
        >
          <Clock className={`w-5 h-5 mt-0.5 ${mode === "pay-later" ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="font-semibold text-sm">Pay Later</p>
            <p className="text-xs text-muted-foreground mt-0.5">Register now, collect payment separately</p>
          </div>
          {mode === "pay-later" && <CheckCircle2 className="w-4 h-4 text-primary ml-auto mt-0.5 shrink-0" />}
        </button>

        <button
          onClick={() => setMode("select-method")}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
            mode === "select-method" ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
          }`}
        >
          <CreditCard className={`w-5 h-5 mt-0.5 ${mode === "select-method" ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="font-semibold text-sm">Select Payment Method</p>
            <p className="text-xs text-muted-foreground mt-0.5">bKash, Nagad, Cash or Bank Transfer</p>
          </div>
          {mode === "select-method" && <CheckCircle2 className="w-4 h-4 text-primary ml-auto mt-0.5 shrink-0" />}
        </button>
      </div>

      {/* Pay Later info */}
      {mode === "pay-later" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-400">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Candidate will be registered. You can record payment later from the candidate profile.</span>
        </div>
      )}

      {/* Method selection */}
      {mode === "select-method" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Choose payment channel:</p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    active ? "border-primary bg-primary/5 scale-[1.02]" : "hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${m.bg}`}>
                    <Icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                  <span className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{m.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Payment details for selected method */}
          {selectedMethod && renderDetails(selectedMethod)}

          {/* Optional payment reference */}
          {selectedMethod && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Payment Reference <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. transaction ID, slip number..."
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the transaction ID or reference from your payment receipt.</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
