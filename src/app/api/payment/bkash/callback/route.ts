import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { executePayment } from "@/lib/gateways/bkash";
import { createTransaction } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.mysccg.de";

const redirect = (outcome: string) =>
  NextResponse.redirect(`${APP_URL}/partner/finance/payments?payment=${outcome}`, 303);

// ── GET /api/payment/bkash/callback ─────────────────────────────────────────
// bKash redirects the user's browser here after payment succeeds/fails.
// Query params: paymentID, status, apiVersion
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentID = searchParams.get("paymentID");
  const status = searchParams.get("status");

  if (!paymentID || status !== "success") return redirect("cancelled");

  // Cookies travel with the browser redirect, so session is available
  const user = await requireSessionUser();
  if (!user?.partnerId) return redirect("auth-required");

  try {
    const result = await executePayment(paymentID);

    const bdtAmount = Number(result.amount);
    let eurAmount = bdtAmount;
    try {
      const rate = await getEurToRate("BDT"); // returns EUR→BDT multiplier
      if (rate > 0) eurAmount = bdtAmount / rate;
    } catch {
      // Non-fatal: store BDT value, admin reviews
    }

    await createTransaction({
      clientId: "",
      partnerId: user.partnerId,
      type: "payment",
      amount: Math.round(eurAmount * 100) / 100,
      reference: result.trxID,
      description: `bKash payment ৳${bdtAmount.toFixed(2)} · TrxID: ${result.trxID}`,
      date: new Date().toISOString(),
    });

    return redirect("bkash-success");
  } catch (err) {
    console.error("bKash callback error:", (err as Error).message);
    return redirect("error");
  }
}
