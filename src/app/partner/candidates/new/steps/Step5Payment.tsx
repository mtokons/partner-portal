"use client";

import { useState } from "react";
import { Clock, CreditCard } from "lucide-react";
import PaymentGateway from "@/app/(shared)/marketplace/checkout/PaymentGateway";
import type { WizardState } from "../WizardShell";

interface Step5PaymentProps {
  depositAmount: number;
  onNext: (data: Pick<WizardState, "paymentOption" | "paymentMethod" | "paymentReference">) => void;
  onBack: () => void;
}

export function Step5Payment({ depositAmount, onNext, onBack }: Step5PaymentProps) {
  const [option, setOption] = useState<"pay-now" | "pay-later">("pay-later");
  const [showGateway, setShowGateway] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  function handlePayNow() {
    if (option === "pay-now" && !reference) {
      setShowGateway(true);
      return;
    }
    onNext({
      paymentOption: option,
      paymentMethod: option === "pay-now" ? "online" : undefined,
      paymentReference: reference ?? undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Payment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you'd like to handle the required deposit of{" "}
          <strong>€{depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          {
            id: "pay-later" as const,
            icon: Clock,
            label: "Pay Later",
            desc: "Record candidate now, payment to follow",
          },
          {
            id: "pay-now" as const,
            icon: CreditCard,
            label: "Pay Deposit Now",
            desc: "Pay via bKash, Nagad, or City Bank",
          },
        ] as const).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setOption(opt.id)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
              option === opt.id
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/40"
            }`}
          >
            <opt.icon
              className={`w-5 h-5 mt-0.5 ${
                option === opt.id ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div>
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {reference && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Payment confirmed. Reference: <span className="font-mono font-bold">{reference}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handlePayNow}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {option === "pay-now" && !reference ? "Pay Now →" : "Next →"}
        </button>
      </div>

      {showGateway && (
        <PaymentGateway
          amount={depositAmount}
          currency="€"
          onSuccess={(ref) => {
            setReference(ref);
            setShowGateway(false);
          }}
          onClose={() => setShowGateway(false)}
        />
      )}
    </div>
  );
}
