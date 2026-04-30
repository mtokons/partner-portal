import { describe, it, expect } from "vitest";
import { distributeOrderRevenue, buildPayoutRecords, buildReferralRecord } from "../../src/lib/payouts";
import type { SalesOffer, SalesOrder } from "../../src/types";

const baseOffer: SalesOffer = {
  id: "off1",
  offerNumber: "SO-2025-00001",
  partnerId: "p1",
  partnerName: "Partner One",
  partnerType: "individual",
  clientId: "c1",
  clientName: "Client One",
  clientEmail: "c@x.com",
  saleType: "partner-individual",
  items: [],
  subtotal: 1000,
  discount: 0,
  totalAmount: 1000,
  status: "accepted",
  validUntil: new Date(Date.now() + 86_400_000).toISOString(),
  createdBy: "u1",
  createdAt: new Date().toISOString(),
} as unknown as SalesOffer;

const baseOrder: SalesOrder = {
  id: "ord1",
  orderNumber: "ORD-2025-00001",
  salesOfferId: "off1",
  offerNumber: "SO-2025-00001",
  partnerId: "p1",
  partnerName: "Partner One",
  clientId: "c1",
  clientName: "Client One",
  clientEmail: "c@x.com",
  status: "pending",
  totalAmount: 1000,
  createdBy: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as SalesOrder;

describe("payouts.distributeOrderRevenue", () => {
  it("partner-individual gets 15% and SCCG keeps the rest after platform fee", () => {
    const dist = distributeOrderRevenue(baseOrder, baseOffer, false);
    expect(dist.partnerPayout).toBeCloseTo(150, 2);
    expect(dist.referralPayout).toBe(0);
    expect(dist.expertPayout).toBe(0);
    expect(dist.platformFee).toBeCloseTo(150 * 0.02, 2);
    expect(dist.sccgNet).toBeCloseTo(1000 - 150 - 3, 2);
  });

  it("partner-institutional gets 20%", () => {
    const dist = distributeOrderRevenue(baseOrder, { ...baseOffer, saleType: "partner-institutional" } as SalesOffer, false);
    expect(dist.partnerPayout).toBeCloseTo(200, 2);
  });

  it("expert involvement adds 5% expert payout", () => {
    const dist = distributeOrderRevenue(baseOrder, baseOffer, true);
    expect(dist.expertPayout).toBeCloseTo(50, 2);
  });
});

describe("payouts.buildReferralRecord", () => {
  it("returns null when no referral is set", () => {
    expect(buildReferralRecord(baseOffer)).toBeNull();
  });
  it("computes referral amount when referral fields exist", () => {
    const offer = { ...baseOffer, referralId: "r1", referralName: "Ref", referralPercent: 10 } as SalesOffer;
    const ref = buildReferralRecord(offer);
    expect(ref).not.toBeNull();
    expect(ref!.amount).toBeCloseTo(100, 2);
    expect(ref!.percentage).toBe(10);
  });
});

describe("payouts.buildPayoutRecords", () => {
  it("creates a partner payout record with correct net after platform fee", () => {
    const recs = buildPayoutRecords(baseOrder, baseOffer, false);
    const partner = recs.find((r) => r.recipientType === "partner");
    expect(partner).toBeDefined();
    expect(partner!.gross).toBeCloseTo(150, 2);
    expect(partner!.net).toBeCloseTo(150 * 0.98, 2);
  });
});
