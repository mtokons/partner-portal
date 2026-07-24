import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { initPayment, isNagadConfigured } from "@/lib/gateways/nagad";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.mysccg.de";

// ── POST /api/payment/nagad ──────────────────────────────────────────────────
// Creates a Nagad payment and returns the hosted redirect URL.
// Body: { amount: number (BDT) }
export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.partnerId) return NextResponse.json({ error: "Not a partner" }, { status: 403 });

  if (!isNagadConfigured()) {
    return NextResponse.json({ error: "Nagad not configured" }, { status: 503 });
  }

  let amount: number;
  try {
    const body = await request.json();
    amount = Number(body.amount);
    if (!amount || amount <= 0) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const orderId = `SC${Date.now().toString(36).toUpperCase().slice(-14)}`;

  try {
    const { redirectURL } = await initPayment({
      orderId,
      amount,
      callbackURL: `${APP_URL}/api/payment/nagad/callback`,
    });
    return NextResponse.json({ url: redirectURL, orderId });
  } catch (err) {
    console.error("Nagad init payment error:", (err as Error).message);
    return NextResponse.json({ error: "Gateway error — try again" }, { status: 502 });
  }
}
