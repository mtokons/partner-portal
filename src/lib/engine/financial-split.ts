import type { CommissionTier, TierStatus, PartnerMargin } from "@/types";

export const TIER_MAP: Record<
  CommissionTier | "platinum",
  { tierStatus: TierStatus; margin: PartnerMargin }
> = {
  standard: { tierStatus: "Silver", margin: 8 },
  premium: { tierStatus: "Gold", margin: 15 },
  enterprise: { tierStatus: "Diamond", margin: 20 },
  platinum: { tierStatus: "Platinum", margin: 25 },
};

export function getTierFromCommission(tier: CommissionTier): {
  tierStatus: TierStatus;
  margin: PartnerMargin;
} {
  return TIER_MAP[tier] ?? TIER_MAP.standard;
}

export interface FinancialSplitLineItem {
  servicePricingId: string;
  serviceName: string;
  basePrice: number;
  quantity: number;
  lineTotal: number;
  depositAmount: number;
}

export interface FinancialSplitInput {
  services: Array<{
    servicePricingId?: string;
    serviceName?: string;
    basePrice: number;
    quantity: number;
    /** Fixed deposit amount in EUR per unit from the product's InitialPayment column. */
    initialPaymentAmount?: number;
  }>;
  partnerMarginPercentage: PartnerMargin;
  /** Fraction of totalServiceFee required as initial deposit. Defaults to 0.30 (30%). Used only when no per-product initialPaymentAmount is set. */
  depositPercentage?: number;
}

export interface FinancialSplitResult {
  totalServiceFee: number;
  sccgShare: number;
  partnerShare: number;
  depositAmount: number;
  marginPercentage: PartnerMargin;
  lineItems: FinancialSplitLineItem[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateFinancialSplit(
  input: FinancialSplitInput
): FinancialSplitResult {
  const defaultDepositFraction = input.depositPercentage ?? 0.3;
  const lineItems: FinancialSplitLineItem[] = input.services.map((s) => {
    const lineTotal = round2(s.basePrice * s.quantity);
    // initialPaymentAmount is a fixed EUR amount per unit from the product table
    const depositAmount =
      s.initialPaymentAmount !== undefined && Number.isFinite(s.initialPaymentAmount) && s.initialPaymentAmount > 0
        ? round2(s.initialPaymentAmount * s.quantity)
        : round2(lineTotal * defaultDepositFraction);

    return {
      servicePricingId: s.servicePricingId ?? "",
      serviceName: s.serviceName ?? "",
      basePrice: s.basePrice,
      quantity: s.quantity,
      lineTotal,
      depositAmount: Math.min(depositAmount, lineTotal),
    };
  });

  const totalServiceFee = round2(
    lineItems.reduce((sum, l) => sum + l.lineTotal, 0)
  );
  const partnerShare = round2(
    totalServiceFee * (input.partnerMarginPercentage / 100)
  );
  const sccgShare = round2(totalServiceFee - partnerShare);
  const depositAmount = round2(
    lineItems.reduce((sum, l) => sum + l.depositAmount, 0)
  );

  return {
    totalServiceFee,
    sccgShare,
    partnerShare,
    depositAmount,
    marginPercentage: input.partnerMarginPercentage,
    lineItems,
  };
}

/** Re-run the split with updated services, preserving the partner margin. */
export function recalculateSplit(
  currentSplit: FinancialSplitResult,
  newServices: FinancialSplitInput["services"],
  depositPercentage?: number
): FinancialSplitResult {
  return calculateFinancialSplit({
    services: newServices,
    partnerMarginPercentage: currentSplit.marginPercentage,
    depositPercentage,
  });
}
