/**
 * serverCurrency.ts
 *
 * Server-side helpers — EUR only display.
 */

import { getBdtToEurRate } from "@/lib/currency";

/** Fetch and cache the BDT→EUR rate. Still used by calculator API. */
export async function loadRate(): Promise<number | null> {
  try {
    return await getBdtToEurRate();
  } catch {
    return null;
  }
}

/** Format amount as EUR only. Legacy params kept for compat. */
export function fmtBdt(
  amount: number,
  rate: number | null,
  _opts?: { compact?: boolean; decimals?: number }
): string {
  if (!rate) return `€${amount.toFixed(2)}`;
  const eur = Math.round((amount * rate + Number.EPSILON) * 100) / 100;
  return `€${eur.toFixed(2)}`;
}

/** Compact integer version — EUR only. */
export function fmtBdtInt(amount: number, rate: number | null): string {
  if (!rate) return `€${Math.round(amount)}`;
  return `€${Math.round(amount * rate)}`;
}
