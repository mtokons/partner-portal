"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendEmailViaGraph } from "@/lib/email";
import { graphPost, getSiteListUrlAsync } from "@/lib/graph";
import type { SessionUser } from "@/types";

export interface PhysicalCardRequestData {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export async function requestPhysicalCardAction(
  data: PhysicalCardRequestData
): Promise<{ success: boolean; requestId: string }> {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;

  const db = getAdminFirestore();

  // Prevent duplicate pending requests
  const existing = await db
    .collection("physicalCardRequests")
    .where("userId", "==", user.id)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("You already have a pending physical card request.");
  }

  const now = new Date().toISOString();
  const doc = {
    userId: user.id,
    userName: user.name || data.fullName,
    userEmail: user.email || "",
    fullName: data.fullName,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 || "",
    city: data.city,
    postalCode: data.postalCode,
    country: data.country,
    fee: 5.0,
    currency: "EUR",
    status: "pending",
    createdAt: now,
  };

  // 1. Save to Firestore
  const ref = await db.collection("physicalCardRequests").add(doc);

  // 2. Create SharePoint record (non-blocking — don't fail the request if SP is down)
  try {
    const spUrl = await getSiteListUrlAsync("PhysicalCardRequests");
    await graphPost(spUrl, {
      fields: {
        Title: data.fullName,
        UserId: user.id,
        UserName: user.name || data.fullName,
        UserEmail: user.email || "",
        FullName: data.fullName,
        AddressLine1: data.addressLine1,
        AddressLine2: data.addressLine2 || "",
        City: data.city,
        PostalCode: data.postalCode,
        Country: data.country,
        Fee: 5.0,
        Currency: "EUR",
        Status: "pending",
        RequestedAt: now,
      },
    });
    console.log("[PhysicalCard] SharePoint record created");
  } catch (spErr) {
    console.error("[PhysicalCard] SP write failed (non-fatal):", spErr);
  }

  // 3. Send notification email to admin
  try {
    const deliveryAddress = [
      data.addressLine1,
      data.addressLine2,
      data.city,
      data.postalCode,
      data.country,
    ]
      .filter(Boolean)
      .join(", ");

    await sendEmailViaGraph({
      to: "portal@mysccg.de",
      toName: "SCCG Portal",
      subject: `[Card Request] Physical SCCG Card — ${data.fullName}`,
      htmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Physical SCCG Card Request</h1>
            <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">A user has requested a physical card — fee: <strong style="color:#fcd34d;">€5.00</strong></p>
          </div>
          <div style="background:#fff;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;width:140px;">Request ID</td><td style="padding:8px 0;font-family:monospace;">${ref.id}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Name</td><td style="padding:8px 0;font-weight:600;">${data.fullName}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;">${user.email || "—"}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">User ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${user.id}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Delivery Address</td><td style="padding:8px 0;">${deliveryAddress}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;">Fee</td><td style="padding:8px 0;font-weight:700;color:#059669;">€5.00 incl. delivery</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Requested At</td><td style="padding:8px 0;">${new Date(now).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</td></tr>
            </table>
            <div style="margin-top:24px;padding:14px 16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;font-size:13px;color:#166534;">
              Action required: Please process and ship this physical card to the address above.
            </div>
          </div>
        </div>
      `,
    });
    console.log("[PhysicalCard] Admin email sent");
  } catch (emailErr) {
    console.error("[PhysicalCard] Email failed (non-fatal):", emailErr);
  }

  return { success: true, requestId: ref.id };
}

