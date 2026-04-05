/**
 * serverCurrency.ts
 *
 * Server-side helpers for displaying BDT amounts with EUR equivalents.
 * Call `loadRate()` once per server component to get the cached rate,
 * then pass it into `fmtBdt()` for every amount rendered on that page.
 */

import { getBdtToEurRate } from "@/lib/currency";

/** Fetch and cache the BDT→EUR rate.  Returns null on failure so pages degrade gracefully. */
export async function loadRate(): Promise<number | null> {
  try {
    return await getBdtToEurRate();
  } catch {
    return null;
  }
}

/**
 * Format a BDT amount showing EUR equivalent when a rate is available.
 * Examples:
 *   fmtBdt(15000, 0.00836)  →  "15,000 BDT (≈ 125.40 EUR)"
 *   fmtBdt(15000, null)     →  "15,000 BDT"
 *   fmtBdt(15000, 0.00836, { compact: true })  →  "BDT 15,000 · €125.40"
 */
export function fmtBdt(
  amount: number,
  rate: number | null,
  opts?: { compact?: boolean; decimals?: number }
): string {
  const d = opts?.decimals ?? 2;
  const bdtFmt = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(amount);

  if (!rate) return `BDT ${bdtFmt}`;

  const eur = Math.round((amount * rate + Number.EPSILON) * Math.pow(10, d)) / Math.pow(10, d);
  const eurFmt = eur.toFixed(d);

  return opts?.compact
    ? `BDT ${bdtFmt} · €${eurFmt}`
    : `BDT ${bdtFmt} (≈ €${eurFmt})`;
}

/** Compact integer version – no decimals, compact display. */
export function fmtBdtInt(amount: number, rate: number | null): string {
  return fmtBdt(amount, rate, { decimals: 0, compact: true });
}
