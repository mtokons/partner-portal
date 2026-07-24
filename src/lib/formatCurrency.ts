const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", LKR: "Rs",
  NPR: "₨", TRY: "₺",
};

/**
 * Format EUR amount — single currency display (EUR only).
 * Secondary currency params kept for backward-compat but ignored.
 */
export function dual(eurAmount: number, _currency?: string, _rate?: number, _compact?: boolean): string {
  return `€${eurAmount.toLocaleString("en", { minimumFractionDigits: 0 })}`;
}

/**
 * Format EUR amount for emails (HTML) — EUR only.
 */
export function dualHtml(eurAmount: number, _currency?: string, _rate?: number): string {
  return `<strong>€${eurAmount.toLocaleString("en", { minimumFractionDigits: 2 })}</strong>`;
}

// Legacy compat — EUR only
export function formatBdtEur(_bdt: number, eur?: number, decimals = 2) {
  return typeof eur === "number"
    ? `€${eur.toFixed(decimals)}`
    : `€${_bdt.toFixed(decimals)}`;
}

export function formatEurWithRate(eur: number, _rate?: number, decimals = 2) {
  return `€${eur.toFixed(decimals)}`;
}
