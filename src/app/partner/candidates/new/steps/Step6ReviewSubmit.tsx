"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { finalizeRegistrationAction, addServiceOrderAction } from "@/app/partner/candidates/actions";
import type { WizardState, SelectedService } from "../WizardShell";
import type { PartnerMargin } from "@/types";

interface Step6ReviewSubmitProps {
  state: WizardState;
  partnerMargin: PartnerMargin;
  partnerId: string;
  onDone: (result: { submissionId: string; candidateId: string }) => void;
  onBack: () => void;
  secondaryCurrency?: string;
  exchangeRate?: number;
}

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

export function Step6ReviewSubmit({
  state,
  partnerMargin,
  partnerId,
  onDone,
  onBack,
  secondaryCurrency = "EUR",
  exchangeRate = 1,
}: Step6ReviewSubmitProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { personalInfo, paymentOption, paymentMethod, paymentReference } = state;
  
  // Editable services state
  const [editingServices, setEditingServices] = useState(false);
  const [services, setServices] = useState<SelectedService[]>(state.selectedServices);

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return;
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, quantity: qty } : s)));
  }

  function removeService(idx: number) {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (services.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    setError(null);
    startTransition(async () => {
      let result: { candidateId: string; submissionId: string } | { error: string };

      if (state.existingCandidateId) {
        result = await addServiceOrderAction(state.existingCandidateId, {
          workflowCategory: personalInfo.workflowCategory,
          selectedServices: services,
          partnerMarginPercentage: partnerMargin,
          paymentOption,
          paymentMethod,
          paymentReference,
          personalInfoUpdates: {
            fullName: personalInfo.fullName,
            email: personalInfo.email,
            phone: personalInfo.phone,
            address: personalInfo.address,
            nationality: personalInfo.nationality,
            country: personalInfo.country,
            passportNumber: personalInfo.passportNumber,
            nationalId: personalInfo.nationalId,
          },
        });
      } else {
        result = await finalizeRegistrationAction({
            partnerId,
            workflowCategory: personalInfo.workflowCategory,
            fullName: personalInfo.fullName,
            dateOfBirth: personalInfo.dateOfBirth,
            email: personalInfo.email,
            phone: personalInfo.phone,
            address: personalInfo.address,
            passportNumber: personalInfo.passportNumber,
            nationalId: personalInfo.nationalId,
            nationality: personalInfo.nationality,
            country: personalInfo.country,
            selectedServices: services,
            partnerMarginPercentage: partnerMargin,
            paymentOption,
            paymentMethod,
            paymentReference,
          });
      }

      if ("error" in result) {
        setError(result.error);
      } else {
        onDone(result);
      }
    });
  }

  const fmt = (n: number) => `€${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const totalFee = services.reduce((s, svc) => s + svc.basePrice * svc.quantity, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {state.existingCandidateId
            ? "Review the service order details before adding to this candidate."
            : "Review all details before registering the candidate."}
        </p>
      </div>

      <div className="space-y-4 text-sm">
        {/* Personal */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <p className="font-semibold text-foreground">Candidate</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <span>Name</span><span className="text-foreground font-medium">{personalInfo.fullName}</span>
            <span>Email</span><span className="text-foreground">{personalInfo.email}</span>
            <span>Category</span><span className="text-foreground">{personalInfo.workflowCategory}</span>
            <span>Country</span><span className="text-foreground">{personalInfo.country}</span>
          </div>
        </div>

        {/* Editable Services */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Services ({services.length})</p>
            <button
              onClick={() => setEditingServices(!editingServices)}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              {editingServices ? "Done Editing" : "Edit"}
            </button>
          </div>
          <div className="space-y-2">
            {services.map((s, idx) => (
              <div key={s.servicePricingId} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="flex-1 truncate">{s.serviceName}</span>
                {editingServices ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(idx, s.quantity - 1)}
                        disabled={s.quantity <= 1}
                        className="w-6 h-6 rounded border flex items-center justify-center text-xs hover:bg-muted disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="text-xs font-medium w-6 text-center text-foreground">{s.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, s.quantity + 1)}
                        className="w-6 h-6 rounded border flex items-center justify-center text-xs hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-foreground text-xs w-20 text-right">{fmt(s.basePrice * s.quantity)}</span>
                    <button
                      onClick={() => removeService(idx)}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-foreground">
                    {s.quantity > 1 ? `${s.quantity} × ` : ""}{fmt(s.basePrice * s.quantity)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {services.length > 0 && (
            <div className="flex justify-between pt-2 border-t border-dashed">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-bold text-foreground">{fmt(totalFee)}</span>
            </div>
          )}
        </div>

        {/* Financial */}
        {state.financialSplit && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
            <p className="font-semibold text-foreground">Financial Split</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fee</span>
              <span className="font-bold">{fmt(state.financialSplit.totalServiceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Share ({partnerMargin}%)</span>
              <span className="text-green-600 dark:text-green-400">{fmt(state.financialSplit.partnerShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SCCG Share</span>
              <span className="text-foreground">{fmt(state.financialSplit.sccgShare)}</span>
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-muted/30 rounded-xl p-4">
          <p className="font-semibold text-foreground mb-1">Payment</p>
          <p className="text-muted-foreground capitalize">
            {paymentOption === "pay-now" ? "Deposit paid online" : "Pay later"}
            {paymentReference && (
              <span className="ml-2 font-mono text-xs text-foreground">{paymentReference}</span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          disabled={isPending}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || services.length === 0}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {state.existingCandidateId ? "Adding Services…" : "Registering…"}
            </>
          ) : (
            state.existingCandidateId ? "Submit Service Order" : "Submit Registration"
          )}
        </button>
      </div>
    </div>
  );
}
