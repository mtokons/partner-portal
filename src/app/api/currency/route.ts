import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/currency?target=BDT
 * Returns EUR → target currency rate(s).
 * If no target specified, returns all rates.
 */
export async function GET(req: NextRequest) {
  try {
    const { getExchangeRates, getEurToRate, CURRENCY_SYMBOLS, CURRENCY_NAMES } = await import("@/lib/currency");
    const target = req.nextUrl.searchParams.get("target");

    if (target && target !== "EUR") {
      const rate = await getEurToRate(target);
      return NextResponse.json({
        base: "EUR",
        target,
        rate,
        symbol: CURRENCY_SYMBOLS[target] || target,
        name: CURRENCY_NAMES[target] || target,
        fetchedAt: new Date().toISOString(),
      });
    }

    const rates = await getExchangeRates();
    return NextResponse.json({
      base: "EUR",
      rates,
      symbols: CURRENCY_SYMBOLS,
      names: CURRENCY_NAMES,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Rates unavailable", rate: null, fetchedAt: new Date().toISOString() },
      { status: 503 }
    );
  }
}
