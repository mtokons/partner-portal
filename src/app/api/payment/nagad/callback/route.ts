import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { completePayment } from "@/lib/gateways/nagad";
import { createTransaction } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.mysccg.de";

const redirect = (outcome: string) =>
  NextResponse.redirect(`${APP_URL}/partner/finance/payments?payment=${outcome}`, 303);

// ── GET /api/payment/nagad/callback ──────────────────────────────────────────
// Nagad redirects the user's browser here after payment.
// Query params: payment_ref_id, status, message, additional_info
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentRefId = searchParams.get("payment_ref_id");
  const status = searchParams.get("status");

  if (!paymentRefId || status?.toLowerCase() !== "success") return redirect("cancelled");

  const user = await requireSessionUser();
  if (!user?.partnerId) return redirect("auth-required");

  try {
    const result = await completePayment(paymentRefId);

    const bdtAmount = Number(result.amount);
    let eurAmount = bdtAmount;
    try {
      const rate = await getEurToRate("BDT");
      if (rate > 0) eurAmount = bdtAmount / rate;
    } catch {
      // Non-fatal
    }

    await createTransaction({
      clientId: "",
      partnerId: user.partnerId,
      type: "payment",
      amount: Math.round(eurAmount * 100) / 100,
      reference: result.trxId,
      description: `Nagad payment ৳${bdtAmount.toFixed(2)} · TrxID: ${result.trxId}`,
      date: new Date().toISOString(),
    });

    return redirect("nagad-success");
  } catch (err) {
    console.error("Nagad callback error:", (err as Error).message);
    return redirect("error");
  }
}
