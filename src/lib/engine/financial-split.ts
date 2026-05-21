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
}

export interface FinancialSplitInput {
  services: Array<{
    servicePricingId?: string;
    serviceName?: string;
    basePrice: number;
    quantity: number;
  }>;
  partnerMarginPercentage: PartnerMargin;
  /** Fraction of totalServiceFee required as initial deposit. Defaults to 0.30 (30%). */
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
  const lineItems: FinancialSplitLineItem[] = input.services.map((s) => ({
    servicePricingId: s.servicePricingId ?? "",
    serviceName: s.serviceName ?? "",
    basePrice: s.basePrice,
    quantity: s.quantity,
    lineTotal: round2(s.basePrice * s.quantity),
  }));

  const totalServiceFee = round2(
    lineItems.reduce((sum, l) => sum + l.lineTotal, 0)
  );
  const partnerShare = round2(
    totalServiceFee * (input.partnerMarginPercentage / 100)
  );
  const sccgShare = round2(totalServiceFee - partnerShare);
  const depositPercent = input.depositPercentage ?? 0.3;
  const depositAmount = round2(totalServiceFee * depositPercent);

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
