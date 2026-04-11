"use server";

// Simple server-side currency conversion helper.
// Uses exchangerate.host free API to get latest BDT -> EUR rate and caches it for 10 minutes.

let _cache: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = Number(process.env.CURRENCY_CACHE_TTL_MS || String(10 * 60 * 1000)); // default 10 minutes

const DEFAULT_API = process.env.EXCHANGE_API_URL || "https://api.exchangerate.host/latest";

export async function getBdtToEurRate(): Promise<number> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.rate;
  }

  try {
    const url = `${DEFAULT_API}?base=BDT&symbols=EUR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    const rate = Number(data?.rates?.EUR);
    if (!rate || Number.isNaN(rate)) throw new Error("Invalid rate received");

    _cache = { rate, fetchedAt: now };
    return rate;
  } catch (err) {
    console.error("Currency API Error, using fallback:", err);
    // Robust fallback: 1 BDT ≈ 0.0084 EUR (approximate market rate)
    return 0.0084;
  }
}

/**
 * Convert BDT to EUR using provided `rate` or by fetching the latest cached rate.
 * Returns EUR rounded to 2 decimals.
 */
export async function convertBdtToEur(amountBdt: number, rate?: number): Promise<number> {
  const r = rate ?? await getBdtToEurRate();
  const eur = Math.round((amountBdt * r + Number.EPSILON) * 100) / 100;
  return eur;
}

export async function clearCurrencyCache() {
  _cache = null;
}
