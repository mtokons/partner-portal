import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getSalesOfferById,
  updateSalesOffer,
  createOfferAcceptanceLog,
  getEmailTrackingByToken,
  updateEmailTracking,
} from "@/lib/sharepoint";
import { convertOfferToOrder } from "@/lib/sharepoint";

/**
 * GET /api/offer-accept?token=<acceptToken>&action=accepted
 *
 * Called when a client clicks the "Accept" or "Reject" button in the offer email.
 * - Validates the token
 * - Logs the acceptance
 * - If accepted: marks offer as "accepted" and converts to Sales Order
 * - Redirects to a thank-you page
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action") as "accepted" | "rejected" | undefined;

  if (!token || !action || !["accepted", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

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

  // 3. Check offer is still actionable
  if (offer.status === "accepted") {
    return redirectToResult("already", "This offer has already been accepted.");
  }
  if (offer.status === "rejected") {
    return redirectToResult("already", "This offer has already been rejected.");
  }

  // 4. Log the acceptance/rejection
  await createOfferAcceptanceLog({
    salesOfferId: offer.id,
    offerNumber: offer.offerNumber,
    acceptToken: token,
    clientEmail: tracking.recipientEmail,
    action,
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    timestamp: new Date().toISOString(),
  });

  // 5. Update email tracking
  await updateEmailTracking(tracking.id, { openedAt: new Date().toISOString() });

  const now = new Date().toISOString();

  if (action === "accepted") {
    // 6a. Mark offer as accepted
    await updateSalesOffer(offer.id, { status: "accepted", acceptedAt: now });

    // 6b. Auto-convert to Sales Order
    try {
      const order = await convertOfferToOrder(offer.id);
      return redirectToResult(
        "accepted",
        `Thank you! Offer ${offer.offerNumber} has been accepted. Your order number is ${order.orderNumber}.`
      );
    } catch {
      // Offer accepted but conversion failed — admin can convert manually
      return redirectToResult(
        "accepted",
        `Thank you! Offer ${offer.offerNumber} has been accepted. Our team will process your order shortly.`
      );
    }
  } else {
    // 6c. Mark offer as rejected
    await updateSalesOffer(offer.id, { status: "rejected", rejectedAt: now });
    return redirectToResult("rejected", `Offer ${offer.offerNumber} has been declined. Thank you for your response.`);
  }
}

function redirectToResult(status: string, message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/offer-response", baseUrl);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

/**
 * Generate a cryptographically secure accept token
 */
export function generateAcceptToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
