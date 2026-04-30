import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getSalesOfferById,
  updateSalesOffer,
  createOfferAcceptanceLog,
  getEmailTrackingByToken,
  updateEmailTracking,
  createNotification,
} from "@/lib/sharepoint";
import { convertOfferToOrder } from "@/lib/sharepoint";
import { isLikelyBot } from "@/lib/api-auth";

/**
 * GET /api/offer-accept?token=<acceptToken>&action=accepted
 *
 * Called when a client clicks the "Accept" or "Reject" button in the offer email.
 * - Skips mutation for known link-prefetchers/bots (logs as 'viewed' instead).
 * - Validates token, offer status, and offer.validUntil expiry.
 * - Idempotent for repeated clicks.
 * - Logs the acceptance/rejection.
 * - If accepted: marks offer as "accepted" and converts to Sales Order.
 * - Redirects to a thank-you page.
 *
 * Defense-in-depth note: GET-triggered mutations are inherently fragile because
 * email scanners (SafeLinks, Slack unfurl, etc.) auto-fetch links. The bot
 * filter below converts those auto-fetches into harmless 'viewed' log entries.
 * Human clicks (real browsers) still mutate as before.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action") as "accepted" | "rejected" | undefined;

  if (!token || !action || !["accepted", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent");
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

  // 1. Look up the email tracking record by token
  const tracking = await getEmailTrackingByToken(token);
  if (!tracking || !tracking.salesOfferId) {
    return redirectToResult("invalid", "This link is invalid or has expired.");
  }

  // 2. Fetch the offer
  const offer = await getSalesOfferById(tracking.salesOfferId);
  if (!offer) {
    return redirectToResult("error", "Sales offer not found.");
  }

  // 3. If link came from a bot/prefetcher, only log as 'viewed' — never mutate.
  if (isLikelyBot(ua)) {
    try {
      await createOfferAcceptanceLog({
        salesOfferId: offer.id,
        offerNumber: offer.offerNumber,
        acceptToken: token,
        clientEmail: tracking.recipientEmail,
        action: "viewed",
        ipAddress: ip,
        userAgent: ua || undefined,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // best-effort
    }
    return new NextResponse("OK", { status: 200, headers: { "Cache-Control": "private, no-store" } });
  }

  // 4. Idempotency for repeated human clicks
  if (offer.status === "accepted") {
    return redirectToResult("already", "This offer has already been accepted.");
  }
  if (offer.status === "rejected") {
    return redirectToResult("already", "This offer has already been rejected.");
  }

  // 5. Offer validity window
  const now = new Date();
  if (offer.validUntil && now > new Date(offer.validUntil)) {
    return redirectToResult(
      "expired",
      `Offer ${offer.offerNumber} expired on ${new Date(offer.validUntil).toLocaleDateString()}. Please contact us for a renewal.`
    );
  }

  // 6. Log the acceptance/rejection
  await createOfferAcceptanceLog({
    salesOfferId: offer.id,
    offerNumber: offer.offerNumber,
    acceptToken: token,
    clientEmail: tracking.recipientEmail,
    action,
    ipAddress: ip,
    userAgent: ua || undefined,
    timestamp: now.toISOString(),
  });

  // 7. Update email tracking
  try {
    await updateEmailTracking(tracking.id, { openedAt: now.toISOString(), status: "opened" });
  } catch {
    // non-fatal
  }

  if (action === "accepted") {
    await updateSalesOffer(offer.id, { status: "accepted", acceptedAt: now.toISOString() });
    try {
      const order = await convertOfferToOrder(offer.id);
      // Notify partner so their dashboard updates in real time.
      if (offer.createdBy) {
        try {
          await createNotification({
            userId: offer.createdBy,
            userType: "partner",
            type: "general",
            title: "Offer accepted",
            message: `Offer ${offer.offerNumber} accepted. Order ${order.orderNumber} created.`,
            read: false,
            relatedId: order.id,
            createdAt: new Date().toISOString(),
          });
        } catch {}
      }
      return redirectToResult(
        "accepted",
        `Thank you! Offer ${offer.offerNumber} has been accepted. Your order number is ${order.orderNumber}.`
      );
    } catch (e) {
      console.error("offer-accept: convertOfferToOrder failed:", (e as Error).message);
      return redirectToResult(
        "accepted",
        `Thank you! Offer ${offer.offerNumber} has been accepted. Our team will process your order shortly.`
      );
    }
  } else {
    await updateSalesOffer(offer.id, { status: "rejected", rejectedAt: now.toISOString() });
    if (offer.createdBy) {
      try {
        await createNotification({
          userId: offer.createdBy,
          userType: "partner",
          type: "general",
          title: "Offer declined",
          message: `Offer ${offer.offerNumber} was declined by the client.`,
          read: false,
          relatedId: offer.id,
          createdAt: new Date().toISOString(),
        });
      } catch {}
    }
    return redirectToResult("rejected", `Offer ${offer.offerNumber} has been declined. Thank you for your response.`);
  }
}

function redirectToResult(status: string, message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/offer-response", baseUrl);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

/**
 * Generate a cryptographically secure accept token
 */
export function generateAcceptToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
