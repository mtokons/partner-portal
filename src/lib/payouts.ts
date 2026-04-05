import type { SalesOffer, SalesOrder, Payout, Referral } from "@/types";

// ============================================================
// Configurable commission rates (can be moved to DB/SP later)
// ============================================================
export const COMMISSION_RATES = {
  partnerIndividual: 0.15,      // 15% to partner
  partnerInstitutional: 0.20,   // 20% to institution
  expertPerOrder: 0.05,         // 5% to expert (if service involved)
  platformFee: 0.02,            // 2% platform fee deducted from payouts
};

export interface PayoutDistribution {
  totalAmount: number;
  referralPayout: number;
  partnerPayout: number;
  expertPayout: number;
  platformFee: number;
  sccgNet: number;
}

/**
 * Distributes order revenue across all stakeholders based on sale type.
 * Uses open questions defaults: partner=15%, institutional=20%, expert=5%.
 */
export function distributeOrderRevenue(
  order: SalesOrder,
  offer: SalesOffer,
  hasExpertService = false
): PayoutDistribution {
  const total = order.totalAmount;

  // Referral payout
  const referralPayout = offer.referralPercent
    ? total * (offer.referralPercent / 100)
    : 0;

  // Partner payout based on sale type
  let partnerPayout = 0;
  if (offer.saleType === "partner-individual") {
    partnerPayout = total * COMMISSION_RATES.partnerIndividual;
  } else if (offer.saleType === "partner-institutional") {
    partnerPayout = total * COMMISSION_RATES.partnerInstitutional;
  }

  // Expert payout (only if service tasks are involved)
  const expertPayout = hasExpertService ? total * COMMISSION_RATES.expertPerOrder : 0;

  // Platform fee on partner/referral payouts
  const platformFee = (partnerPayout + referralPayout + expertPayout) * COMMISSION_RATES.platformFee;

  // SCCG net revenue
  const sccgNet = Math.max(0, total - referralPayout - partnerPayout - expertPayout - platformFee);

  return {
    totalAmount: total,
    referralPayout: Math.round(referralPayout * 100) / 100,
    partnerPayout: Math.round(partnerPayout * 100) / 100,
    expertPayout: Math.round(expertPayout * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    sccgNet: Math.round(sccgNet * 100) / 100,
  };
}

/**
 * Build the Payout records that should be created when an order completes.
 */
export function buildPayoutRecords(
  order: SalesOrder,
  offer: SalesOffer,
  hasExpertService = false
): Omit<Payout, "id">[] {
  const dist = distributeOrderRevenue(order, offer, hasExpertService);
  const now = new Date().toISOString();
  const records: Omit<Payout, "id">[] = [];

  if (dist.referralPayout > 0 && offer.referralId) {
    records.push({
      recipientId: offer.referralId,
      recipientName: offer.referralName || "Referrer",
      recipientType: "referrer",
      relatedOrderId: order.id,
      relatedOrderNumber: order.orderNumber,
      gross: dist.referralPayout,
      deductions: Math.round(dist.referralPayout * COMMISSION_RATES.platformFee * 100) / 100,
      net: Math.round(dist.referralPayout * (1 - COMMISSION_RATES.platformFee) * 100) / 100,
      currency: "BDT",
      status: "pending",
      createdAt: now,
    });
  }

  if (dist.partnerPayout > 0) {
    records.push({
      recipientId: offer.partnerId,
      recipientName: offer.partnerName || "Partner",
      recipientType: "partner",
      relatedOrderId: order.id,
      relatedOrderNumber: order.orderNumber,
      gross: dist.partnerPayout,
      deductions: Math.round(dist.partnerPayout * COMMISSION_RATES.platformFee * 100) / 100,
      net: Math.round(dist.partnerPayout * (1 - COMMISSION_RATES.platformFee) * 100) / 100,
      currency: "BDT",
      status: "pending",
      createdAt: now,
    });
  }

  return records;
}

/**
 * Build the Referral record from an accepted offer.
 */
export function buildReferralRecord(offer: SalesOffer): Omit<Referral, "id"> | null {
  if (!offer.referralId || !offer.referralPercent) return null;
  const amount = Math.round(offer.totalAmount * (offer.referralPercent / 100) * 100) / 100;
  return {
    referrerId: offer.referralId,
    referrerName: offer.referralName || "Referrer",
    referrerType: "partner",
    salesOfferId: offer.id,
    percentage: offer.referralPercent,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}
