"use client";

import { useState, useTransition } from "react";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { finalizeRegistrationAction } from "@/app/partner/candidates/actions";
import type { WizardState } from "../WizardShell";
import type { PartnerMargin } from "@/types";

interface Step6ReviewSubmitProps {
  state: WizardState;
  partnerMargin: PartnerMargin;
  partnerId: string;
  onDone: (result: { submissionId: string; candidateId: string }) => void;
  onBack: () => void;
}

export function Step6ReviewSubmit({
  state,
  partnerMargin,
  partnerId,
  onDone,
  onBack,
}: Step6ReviewSubmitProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { personalInfo, selectedServices, financialSplit, paymentOption, paymentMethod, paymentReference } = state;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await finalizeRegistrationAction(
        {
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
          selectedServices,
          partnerMarginPercentage: partnerMargin,
          paymentOption,
          paymentMethod,
          paymentReference,
        },
        partnerId
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        onDone(result);
      }
    });
  }

  const fmt = (n: number) => `€${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review all details before registering the candidate.
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

        {/* Services */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <p className="font-semibold text-foreground">Services ({selectedServices.length})</p>
          <div className="space-y-1">
            {selectedServices.map((s) => (
              <div key={s.servicePricingId} className="flex justify-between text-muted-foreground">
                <span>{s.serviceName}</span>
                <span className="text-foreground">{fmt(s.basePrice * s.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial */}
        {financialSplit && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
            <p className="font-semibold text-foreground">Financial Split</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fee</span>
              <span className="font-bold">{fmt(financialSplit.totalServiceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Share ({partnerMargin}%)</span>
              <span className="text-green-600 dark:text-green-400">{fmt(financialSplit.partnerShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SCCG Share</span>
              <span className="text-foreground">{fmt(financialSplit.sccgShare)}</span>
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
          disabled={isPending}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Registering…
            </>
          ) : (
            "Submit Registration"
          )}
        </button>
      </div>
    </div>
  );
}
