import type { Product, Promotion } from "@/types";

/** Check if a promotion is currently active (date-bounded) */
export function isPromotionActive(promo: Promotion): boolean {
  if (!promo.isActive) return false;
  const now = new Date();
  const start = new Date(promo.startDate);
  if (now < start) return false;
  if (promo.endDate && now > new Date(promo.endDate)) return false;
  return true;
}

/** Find the best promotion applicable to a single product */
export function findBestPromotion(
  product: Product,
  promotions: Promotion[]
): Promotion | null {
  const active = promotions.filter(isPromotionActive);
  const applicable = active.filter((p) => {
    if (p.appliesTo === "all") return true;
    if (p.appliesTo === "product") return p.productId === product.id;
    if (p.appliesTo === "category") return p.category === product.category;
    return false;
  });

  if (!applicable.length) return null;

  // Pick promo that gives the greatest discount value
  return applicable.reduce((best, promo) => {
    const discountA = calcDiscount(product.price, best);
    const discountB = calcDiscount(product.price, promo);
    return discountB > discountA ? promo : best;
  });
}

/** Calculate discount amount for a product given a promotion */
function calcDiscount(price: number, promo: Promotion): number {
  if (promo.discountType === "percent") return price * (promo.discountValue / 100);
  return Math.min(promo.discountValue, price);
}

/** Get the effective price of a product after applying the best promotion */
export function getEffectivePrice(
  product: Product,
  promotions: Promotion[]
): { effectivePrice: number; appliedPromotion: Promotion | null; savedAmount: number } {
  // Product-level discount takes priority if larger
  let baseDiscount = 0;
  if (product.discount && product.discount > 0) {
    if (product.discountType === "percent") {
      baseDiscount = product.price * (product.discount / 100);
    } else {
      baseDiscount = product.discount;
    }
    // Check if product discount has expired
    if (product.discountExpiry && new Date() > new Date(product.discountExpiry)) {
      baseDiscount = 0;
    }
  }

  const bestPromo = findBestPromotion(product, promotions);
  const promoDiscount = bestPromo ? calcDiscount(product.price, bestPromo) : 0;

  const savedAmount = Math.max(baseDiscount, promoDiscount);
  return {
    effectivePrice: Math.max(0, product.price - savedAmount),
    appliedPromotion: promoDiscount >= baseDiscount ? bestPromo : null,
    savedAmount,
  };
}
