"use client";

import { useEffect, useState } from "react";
import { calculateFinancialSplit, type FinancialSplitResult } from "@/lib/engine/financial-split";
import type { PartnerMargin } from "@/types";
import type { SelectedService } from "../WizardShell";

interface Step4FinancialSplitProps {
  selectedServices: SelectedService[];
  partnerMargin: PartnerMargin;
  onNext: (split: FinancialSplitResult) => void;
  onBack: () => void;
}

export function Step4FinancialSplit({
  selectedServices,
  partnerMargin,
  onNext,
  onBack,
}: Step4FinancialSplitProps) {
  const [split, setSplit] = useState<FinancialSplitResult | null>(null);

  useEffect(() => {
    const result = calculateFinancialSplit({
      services: selectedServices.map((s) => ({
        serviceId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: partnerMargin,
    });
    setSplit(result);
  }, [selectedServices, partnerMargin]);

  if (!split) return null;

  const fmt = (n: number) =>
    `€${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Financial Split</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automated split calculation based on your {partnerMargin}% partner margin.
        </p>
      </div>

      {/* Line items */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {split.lineItems.map((item) => (
              <tr key={item.servicePricingId}>
                <td className="px-4 py-2">{item.serviceName} × {item.quantity}</td>
                <td className="px-4 py-2 text-right">{fmt(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
        {[
          ["Total Service Fee", fmt(split.totalServiceFee), "font-bold text-foreground"],
          [`SCCG Share`, fmt(split.sccgShare), "text-muted-foreground"],
          [`Your Share (${partnerMargin}%)`, fmt(split.partnerShare), "text-green-600 dark:text-green-400 font-semibold"],
          ["Required Deposit (30%)", fmt(split.depositAmount), "text-blue-600 dark:text-blue-400"],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className={cls as string}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(split)}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Confirm →
        </button>
      </div>
    </div>
  );
}
