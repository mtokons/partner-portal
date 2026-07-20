"use client";

import { useState, useTransition } from "react";
import { X, Banknote, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { recordPaymentAction } from "../actions";
import type { CandidatePaymentStatus } from "@/types";

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

interface Props {
  candidateId: string;
  candidateName: string;
  serviceId?: string;
  serviceName: string;
  serviceTotal: number;       // EUR — this service's total price
  depositRequired: number;    // EUR — candidate's required deposit (all services)
  alreadyPaid: number;        // EUR — cumulative paid so far
  totalServiceFee: number;    // EUR — candidate's total fee (all services)
  secondaryCurrency: string;
  exchangeRate: number;
  onClose: () => void;
  onSuccess: (newPaidAmount: number, newStatus: CandidatePaymentStatus) => void;
}

export function PaymentNotificationModal({
  candidateId,
  candidateName,
  serviceId,
  serviceName,
  serviceTotal,
  depositRequired,
  alreadyPaid,
  totalServiceFee,
  secondaryCurrency,
  exchangeRate,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const amountNum = parseFloat(amount.replace(",", ".")) || 0;
  const remainingDeposit = Math.max(0, depositRequired - alreadyPaid);
  const remaining = Math.max(0, totalServiceFee - alreadyPaid);
  const isInitialPayment = amountNum > 0 && amountNum >= remainingDeposit && remainingDeposit > 0;
  const isFullPayment = amountNum >= remaining && remaining > 0;
  const showSec = secondaryCurrency !== "EUR" && exchangeRate > 1;
  const secSym = CSYM[secondaryCurrency] || secondaryCurrency;
  const secAmount = Math.round(amountNum * exchangeRate);

  function handleSubmit(isInitial: boolean) {
    if (amountNum <= 0) { setError("Enter a valid amount greater than 0"); return; }
    setError(null);
    startTransition(async () => {
      const res = await recordPaymentAction({
        candidateId,
        serviceId,
        amountEur: amountNum,
        isInitialPayment: isInitial,
        paymentNote: note || undefined,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        setDone(true);
        setTimeout(() => {
          onSuccess(res.newPaidAmount, res.newPaymentStatus);
          onClose();
        }, 1400);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-foreground">Payment Notification</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Candidate + service context */}
          <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{candidateName}</p>
            <p className="text-xs text-muted-foreground">
              Service: <span className="font-medium text-foreground">{serviceName}</span>
              <span className="ml-2">· €{serviceTotal.toFixed(2)}</span>
            </p>
          </div>

          {/* Payment summary tiles */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Fee</p>
              <p className="font-bold text-foreground text-sm mt-0.5">€{totalServiceFee.toFixed(2)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wide">Min. Deposit</p>
              <p className="font-bold text-amber-800 dark:text-amber-300 text-sm mt-0.5">€{depositRequired.toFixed(2)}</p>
              {showSec && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500">
                  ≈ {secSym}{Math.round(depositRequired * exchangeRate).toLocaleString()}
                </p>
              )}
            </div>
            <div className={`rounded-xl px-3 py-2.5 text-center ${alreadyPaid > 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"}`}>
              <p className={`text-[10px] uppercase tracking-wide ${alreadyPaid > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                Already Paid
              </p>
              <p className={`font-bold text-sm mt-0.5 ${alreadyPaid > 0 ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                €{alreadyPaid.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Payment Amount in EUR Received <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">€</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isPending || done}
                autoFocus
              />
            </div>
            {showSec && amountNum > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {secSym}{secAmount.toLocaleString()} {secondaryCurrency}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Payment Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank transfer, bKash, reference no..."
              className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={isPending || done}
            />
          </div>

          {/* Payment type hint */}
          {amountNum > 0 && !done && (
            <div className={`rounded-xl px-4 py-3 text-xs flex items-start gap-2 ${
              isFullPayment
                ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                : isInitialPayment
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}>
              {isFullPayment ? (
                <><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> Full payment! All services can proceed.</>
              ) : isInitialPayment ? (
                <><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> Covers required deposit — service workflow will unlock after confirmation.</>
              ) : (
                <><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Still {secSym && showSec ? "" : "€"}{remainingDeposit > amountNum ? `€${(remainingDeposit - amountNum).toFixed(2)} remaining to meet the minimum deposit.` : `below minimum deposit.`}
                </>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          {done && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Payment recorded successfully!
            </div>
          )}
        </div>

        {/* Actions */}
        {!done && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {isInitialPayment || isFullPayment ? (
              <button
                onClick={() => handleSubmit(true)}
                disabled={isPending || amountNum <= 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Initial Payment Done"}
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={isPending || amountNum <= 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Confirm"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
