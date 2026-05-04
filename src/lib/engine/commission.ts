import type { CommissionRule, SalesOffer, SalesOfferItem, Partner, PromoCode } from "@/types";

interface CommissionResult {
  ruleId: string;
  percent: number;
  amount: number;
  description: string;
}

/**
 * Calculates the commission for a sales offer based on active rules.
 * Implements the priority-based rule matching logic from ARCHITECTURE-SCCG-V2.md
 */
export function calculateCommission(
  offer: Partial<SalesOffer>,
  items: SalesOfferItem[],
  partner: Partner | null,
  promoCode: PromoCode | null,
  rules: CommissionRule[]
): CommissionResult | null {
  if (!offer.totalAmount || offer.totalAmount <= 0) return null;

  // Filter active and valid rules
  const activeRules = rules.filter(r => {
    if (!r.isActive) return false;
    const now = new Date();
    if (r.effectiveFrom && new Date(r.effectiveFrom) > now) return false;
    if (r.effectiveUntil && new Date(r.effectiveUntil) < now) return false;
    return true;
  });

  // Sort by priority (higher first)
  const sortedRules = [...activeRules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // 1. Match Code Type
    const expectedType = promoCode?.codeType || "direct"; // Default to direct if no code
    if (rule.codeType !== expectedType && rule.codeType !== "direct" as any) continue;

    // 2. Match Partner Tier
    if (rule.partnerTier !== "any" && partner?.commissionTier !== rule.partnerTier) continue;

    // 3. Match Order Minimum
    if (rule.minOrderAmount > 0 && offer.totalAmount < rule.minOrderAmount) continue;

    // 4. Match Product Category (if specified)
    if (rule.productCategory !== "any") {
      const hasCategoryMatch = items.some(item => {
        // This assumes we have product category info in items or we fetch it
        // For now, if rule specifies a category, we check if ANY item matches
        return true; // Placeholder for deeper category logic
      });
      if (!hasCategoryMatch) continue;
    }

    // Rule matched!
    const baseAmount = offer.totalAmount;
    let amount = baseAmount * (rule.commissionPercent / 100);

    // Apply cap if exists
    if (rule.maxCommission > 0 && amount > rule.maxCommission) {
      amount = rule.maxCommission;
    }

    return {
      ruleId: rule.id,
      percent: rule.commissionPercent,
      amount: Math.round(amount * 100) / 100,
      description: `Commission based on rule: ${rule.name}`,
    };
  }

  return null;
}
