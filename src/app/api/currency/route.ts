import { NextResponse } from "next/server";

/**
 * GET /api/currency
 * Returns the current BDT→EUR rate from the cache (or freshly fetched).
 * Used by client components that need the rate without a server action.
 *
 * Response: { rate: number, fetchedAt: string }
 */
export async function GET() {
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    const rate = await getBdtToEurRate();
    return NextResponse.json({ rate, fetchedAt: new Date().toISOString() });
  } catch (err) {
    // Fallback so clients can still render something useful
    return NextResponse.json(
      { error: "Rate unavailable", rate: null, fetchedAt: new Date().toISOString() },
      { status: 503 }
    );
  }
}
