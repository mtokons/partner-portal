import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { createPayment, isBkashConfigured } from "@/lib/gateways/bkash";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.mysccg.de";

// ── POST /api/payment/bkash ──────────────────────────────────────────────────
// Creates a bKash payment and returns the hosted payment URL.
// Body: { amount: number (BDT) }
export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.partnerId) return NextResponse.json({ error: "Not a partner" }, { status: 403 });

  if (!isBkashConfigured()) {
    return NextResponse.json({ error: "bKash not configured" }, { status: 503 });
  }

  let amount: number;
  try {
    const body = await request.json();
    amount = Number(body.amount);
    if (!amount || amount <= 0) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Unique invoice ref (≤20 chars required by bKash)
  const ref = `SC${Date.now().toString(36).toUpperCase().slice(-12)}`;

  try {
    const { bkashURL } = await createPayment({
      amount,
      payerReference: user.email ?? user.partnerId,
      merchantInvoiceNumber: ref,
      callbackURL: `${APP_URL}/api/payment/bkash/callback`,
    });
    return NextResponse.json({ url: bkashURL, ref });
  } catch (err) {
    console.error("bKash create payment error:", (err as Error).message);
    return NextResponse.json({ error: "Gateway error — try again" }, { status: 502 });
  }
}
