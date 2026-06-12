// Multi-currency conversion service.
// EUR is the home/primary currency. Converts EUR → any target currency.
// Uses exchangerate.host free API with 10-minute cache per currency pair.

export type SupportedCurrency = "EUR" | "BDT" | "INR" | "USD" | "GBP" | "AED" | "SAR" | "MYR" | "PKR" | "LKR" | "NPR" | "TRY";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", LKR: "Rs",
  NPR: "₨", TRY: "₺",
};

export const CURRENCY_NAMES: Record<string, string> = {
  EUR: "Euro", BDT: "Bangladeshi Taka", INR: "Indian Rupee",
  USD: "US Dollar", GBP: "British Pound", AED: "UAE Dirham",
  SAR: "Saudi Riyal", MYR: "Malaysian Ringgit", PKR: "Pakistani Rupee",
  LKR: "Sri Lankan Rupee", NPR: "Nepalese Rupee", TRY: "Turkish Lira",
};

// Fallback rates (EUR → X) — approximate, used when API is down
const FALLBACK_RATES: Record<string, number> = {
  BDT: 142.72, INR: 111.37, USD: 1.16, GBP: 0.87, AED: 4.27,
  SAR: 4.36, MYR: 4.61, PKR: 330.0, LKR: 340.0, NPR: 178.0, TRY: 53.42,
};

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

let _cache: RateCache | null = null;
const CACHE_TTL_MS = Number(process.env.CURRENCY_CACHE_TTL_MS || String(10 * 60 * 1000));

/** Fetch all EUR→X rates from open.er-api.com (same source as Google Finance), cached for 10 minutes */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.rates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: Record<string, number> = {};

    if (data?.rates) {
      for (const code of Object.keys(CURRENCY_SYMBOLS)) {
        if (code === "EUR") continue;
        const val = Number(data.rates[code]);
        if (val > 0) rates[code] = val;
      }
    }

    // Fill missing with fallbacks
    for (const [code, fb] of Object.entries(FALLBACK_RATES)) {
      if (!rates[code]) rates[code] = fb;
    }

    _cache = { rates, fetchedAt: now };
    return rates;
  } catch (err) {
    console.warn("[currency] live rates unavailable, using fallbacks:", (err as Error)?.message);
    // Cache fallbacks briefly
    _cache = { rates: { ...FALLBACK_RATES }, fetchedAt: now - CACHE_TTL_MS / 2 };
    return FALLBACK_RATES;
  }
}

/** Get EUR → single currency rate */
export async function getEurToRate(currency: string): Promise<number> {
  if (currency === "EUR") return 1;
  const rates = await getExchangeRates();
  return rates[currency] || FALLBACK_RATES[currency] || 1;
}

/** Convert EUR amount to target currency */
export async function convertEurTo(amountEur: number, currency: string, rate?: number): Promise<number> {
  if (currency === "EUR") return amountEur;
  const r = rate ?? await getEurToRate(currency);
  return Math.round((amountEur * r + Number.EPSILON) * 100) / 100;
}

/** Convert target currency to EUR */
export async function convertToEur(amount: number, currency: string, rate?: number): Promise<number> {
  if (currency === "EUR") return amount;
  const r = rate ?? await getEurToRate(currency);
  if (r <= 0) return amount;
  return Math.round((amount / r + Number.EPSILON) * 100) / 100;
}

// Legacy compat
export async function getBdtToEurRate(): Promise<number> {
  const r = await getEurToRate("BDT");
  return r > 0 ? 1 / r : 0.0084;
}

export async function convertBdtToEur(amountBdt: number, rate?: number): Promise<number> {
  return convertToEur(amountBdt, "BDT", rate ? 1 / rate : undefined);
}

export async function clearCurrencyCache() {
  _cache = null;
}
