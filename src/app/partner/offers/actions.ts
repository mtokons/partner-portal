"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getSalesOffers, getSalesOfferById, getSalesOfferItems,
  getClients, getProducts,
  createSalesOffer, createSalesOfferItem,
  updateSalesOffer, deleteSalesOffer,
  generateOfferNumber,
  getPartnerByEmail,
} from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

async function requirePartner(): Promise<SessionUser & { partnerId: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not an approved partner");
  return user as SessionUser & { partnerId: string };
}

export async function getPartnerOffers() {
  const user = await requirePartner();
  return getSalesOffers(user.partnerId);
}

export async function getPartnerOfferDetail(offerId: string) {
  const user = await requirePartner();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return null;
  // Verify ownership
  if (user.role !== "admin" && offer.partnerId !== user.partnerId) return null;
  const items = await getSalesOfferItems(offerId);
  return { offer, items };
}

export async function loadOfferFormData() {
  const user = await requirePartner();
  const [clients, candidates, products, partner] = await Promise.all([
    getClients(user.partnerId),
    import("@/lib/sharepoint").then((m) => m.getCandidates(user.partnerId)),
    getProducts(),
    getPartnerByEmail(user.email!),
  ]);

  // Merge candidates into the clients list so offers can select them
  const candidateAsClients = candidates.map((c) => ({
    id: c.id,
    name: c.fullName,
    email: c.email,
    phone: c.phone || "",
    company: "",
    partnerId: c.partnerId,
    status: "active" as const,
    createdAt: c.createdAt || "",
  }));

  // Deduplicate by email
  const allClients = [...clients];
  for (const cc of candidateAsClients) {
    if (!allClients.some((c) => c.email.toLowerCase() === cc.email.toLowerCase())) {
      allClients.push(cc as any);
    }
  }

  return {
    clients: allClients,
    products: products.filter((p) => p.isAvailable !== false),
    partnerName: partner?.name || user.name || "",
    partnerCompany: partner?.company || user.company || "",
  };
}

export async function createPartnerOffer(data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  discount: number;
  discountType: "fixed" | "percent";
  validUntil: string;
  notes?: string;
}) {
  const user = await requirePartner();
  const partner = await getPartnerByEmail(user.email!);

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = data.discountType === "percent" ? subtotal * (data.discount / 100) : data.discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const offerNumber = await generateOfferNumber();
  const now = new Date().toISOString();

  const offer = await createSalesOffer({
    offerNumber,
    partnerId: user.partnerId,
    partnerName: partner?.name || user.name || "",
    clientId: data.clientId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    subtotal: subtotal,
    discount: data.discount,
    discountType: data.discountType,
    totalAmount,
    status: "draft",
    validUntil: data.validUntil,
    notes: data.notes,
    saleType: partner?.partnerType === "institutional" ? "partner-institutional" : "partner-individual",
    referralId: "",
    referralPercent: partner?.marginPercentage ?? 0,
    createdBy: user.id,
    createdAt: now,
  });

  // Create line items
  for (const item of data.items) {
    await createSalesOfferItem({
      salesOfferId: offer.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    });
  }

  revalidatePath("/partner/offers");
  return { success: true, offerId: offer.id };
}

export async function sendPartnerOffer(offerId: string) {
  const user = await requirePartner();
  const offer = await getSalesOfferById(offerId);
  if (!offer || offer.partnerId !== user.partnerId) throw new Error("Offer not found");

  await updateSalesOffer(offerId, { status: "sent" });
  
  // Email sending via existing email system
  try {
    if (offer.clientEmail) {
      const { sendEmailViaGraph } = await import("@/lib/email");
      await sendEmailViaGraph({
        to: offer.clientEmail,
        toName: offer.clientName,
        subject: `Sales Offer ${offer.offerNumber} from SCCG Partner`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Sales Offer</h1>
              <p style="color: #94a3b8; margin: 8px 0 0;">Offer #${offer.offerNumber}</p>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Dear <strong>${offer.clientName}</strong>,</p>
              <p>You have received a new offer with a total of <strong>€${offer.totalAmount.toFixed(2)}</strong>.</p>
              <p>Please log in to view the full details or contact your partner representative.</p>
              <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Portal</p>
            </div>
          </div>
        `,
      });
    }
  } catch {
    // Email sending is optional — don't fail the action
  }

  revalidatePath("/partner/offers");
  return { success: true };
}

export async function deletePartnerOffer(offerId: string) {
  const user = await requirePartner();
  const offer = await getSalesOfferById(offerId);
  if (!offer || offer.partnerId !== user.partnerId) throw new Error("Offer not found");
  if (offer.status !== "draft") throw new Error("Can only delete draft offers");

  await deleteSalesOffer(offerId);
  revalidatePath("/partner/offers");
  return { success: true };
}
