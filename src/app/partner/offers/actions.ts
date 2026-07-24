"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import {
  getSalesOffers, getSalesOfferById, getSalesOfferItems,
  getClients, getProducts,
  createSalesOffer, createSalesOfferItem,
  updateSalesOffer, deleteSalesOffer,
  generateOfferNumber,
  getPartnerByEmail,
  createEmailTracking,
} from "@/lib/sharepoint";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

async function requirePartner(): Promise<SessionUser & { partnerId: string }> {
  const session = await getEffectiveSession();
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
    preferredCurrency: partner?.preferredCurrency || "BDT",
  };
}

export async function createPartnerOffer(data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientType?: "registered" | "prospective";
  prospectName?: string;
  prospectEmail?: string;
  prospectPhone?: string;
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

  const isProspect = data.clientType === "prospective";
  const effectiveName = isProspect ? (data.prospectName || "Prospective Client") : data.clientName;
  const effectiveEmail = isProspect ? (data.prospectEmail || "") : data.clientEmail;

  const offer = await createSalesOffer({
    offerNumber,
    partnerId: user.partnerId,
    partnerName: partner?.name || user.name || "",
    clientId: isProspect ? "" : data.clientId,
    clientName: effectiveName,
    clientEmail: effectiveEmail,
    clientType: data.clientType || "registered",
    prospectName: isProspect ? data.prospectName : undefined,
    prospectEmail: isProspect ? data.prospectEmail : undefined,
    prospectPhone: isProspect ? data.prospectPhone : undefined,
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

  // Auto-create user account for the offer recipient (deduplication by email)
  try {
    const recipientEmail = effectiveEmail || data.clientEmail;
    const recipientName = effectiveName || data.clientName;
    if (recipientEmail) {
      const { ensureCandidateUserAccount } = await import("@/lib/candidate-user");
      await ensureCandidateUserAccount({
        email: recipientEmail,
        fullName: recipientName,
        partnerId: user.partnerId,
        partnerName: partner?.name || user.name || "SCCG Partner",
        sccgId: offerNumber,
      });
    }
  } catch {
    // User account creation is non-blocking
  }

  revalidatePath("/partner/offers");
  return { success: true, offerId: offer.id };
}

export async function sendPartnerOffer(offerId: string) {
  const user = await requirePartner();
  const offer = await getSalesOfferById(offerId);
  if (!offer || offer.partnerId !== user.partnerId) throw new Error("Offer not found");

  await updateSalesOffer(offerId, { status: "sent" });

  const partner = await getPartnerByEmail(user.email!);
  const secCur = partner?.preferredCurrency || "BDT";
  const { getEurToRate } = await import("@/lib/currency");
  const rate = secCur !== "EUR" ? await getEurToRate(secCur) : 1;

  // ── Fetch offer items + product details ──────────────────────────────────
  const items = await getSalesOfferItems(offerId);
  const products = await getProducts();
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // Derive service category label for the email
  const primaryCategory = (() => {
    const cats = items.map((i) => productMap[i.productId]?.category).filter(Boolean);
    if (!cats.length) return "Germany Career Services";
    const cat = cats[0]!;
    const map: Record<string, string> = {
      "Opportunity Card": "Opportunity Card (Chancenkarte)",
      "Ausbildung": "Ausbildung (Vocational Training)",
      "Student": "Student Programme",
      "Training & Language": "Language & Training",
      "Others": "Career Services",
    };
    return map[cat] ?? cat;
  })();

  const serviceDetails = items.map((item) => {
    const product = productMap[item.productId];
    const rawTags = product?.tags ?? [];
    const includes = rawTags
      .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
      .map((t) => t.replace(/^includes?:/i, "").trim());
    return {
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      description: product?.description || "",
      sessions: product?.sessionsCount || 0,
      category: product?.category || "",
      includes,
    };
  });

  // ── Create accept/reject tokens ───────────────────────────────────────────
  // Guard against a localhost NEXTAUTH_URL leaking into public email links.
  const rawBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl =
    rawBaseUrl && !rawBaseUrl.includes("localhost") && !rawBaseUrl.includes("127.0.0.1")
      ? rawBaseUrl.replace(/\/$/, "")
      : "https://portal.mysccg.de";
  let acceptUrl = `${baseUrl}/login?portal=customer`;
  let rejectUrl: string | undefined;
  try {
    if (offer.clientEmail) {
      const acceptToken = crypto.randomBytes(32).toString("hex");
      const rejectToken = crypto.randomBytes(32).toString("hex");
      const now = new Date().toISOString();
      await createEmailTracking({
        salesOfferId: offer.id,
        offerNumber: offer.offerNumber,
        recipientEmail: offer.clientEmail,
        recipientName: offer.clientName || undefined,
        senderName: partner?.name || user.name || "SCCG Partner",
        subject: `Service Offer ${offer.offerNumber}`,
        status: "sent",
        sentAt: now,
        acceptToken,
        createdAt: now,
      });
      // Create a second record for reject token
      await createEmailTracking({
        salesOfferId: offer.id,
        offerNumber: offer.offerNumber,
        recipientEmail: offer.clientEmail,
        recipientName: offer.clientName || undefined,
        senderName: partner?.name || user.name || "SCCG Partner",
        subject: `Service Offer ${offer.offerNumber}`,
        status: "sent",
        sentAt: now,
        acceptToken: rejectToken,
        createdAt: now,
      });
      acceptUrl = `${baseUrl}/api/offer-accept?token=${acceptToken}&action=accepted`;
      rejectUrl = `${baseUrl}/api/offer-accept?token=${rejectToken}&action=rejected`;
    }
  } catch {
    // Non-blocking — fall back to portal login
  }

  // ── Ensure candidate has a portal login ───────────────────────────────────
  let loginPassword: string | undefined;
  try {
    if (offer.clientEmail) {
      const { ensureCandidateUserAccount } = await import("@/lib/candidate-user");
      const result = await ensureCandidateUserAccount({
        email: offer.clientEmail,
        fullName: offer.clientName || "Candidate",
        partnerId: user.partnerId,
        partnerName: partner?.name || user.name || "SCCG Partner",
        sccgId: offer.offerNumber,
      });
      if (result.tempPassword) loginPassword = result.tempPassword;
    }
  } catch {
    // Non-blocking
  }

  // ── Fetch partner logo as base64 for PDF ────────────────────────────────
  let logoBase64: string | undefined;
  let logoMime = "image/png";
  try {
    if (partner?.logoUrl) {
      const res = await fetch(partner.logoUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        logoMime = res.headers.get("content-type") || "image/png";
        logoBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      }
    }
  } catch {
    // Non-blocking
  }

  // ── Generate PDF with partner logo + service descriptions ────────────────
  let pdfBase64: string | undefined;
  try {
    const { generateSalesOfferPdf } = await import("@/lib/pdf");
    const pdfItems = items.map((i) => {
      const product = productMap[i.productId];
      const rawTags = product?.tags ?? [];
      const includes = rawTags
        .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
        .map((t) => t.replace(/^includes?:/i, "").trim());
      return {
        name: i.productName,
        quantity: i.quantity,
        price: i.unitPrice,
        description: product?.description,
        sessions: product?.sessionsCount,
        includes: includes.length > 0 ? includes : undefined,
      };
    });
    const pdfBytes = generateSalesOfferPdf(
      partner?.name || offer.partnerName || "SCCG Career Lab Germany",
      offer.clientName || "Client",
      pdfItems,
      offer.validUntil,
      rate,
      {
        subtotal: offer.subtotal,
        discount: offer.discount,
        discountType: offer.discountType,
        totalAmount: offer.totalAmount,
      },
      secCur,
      rate,
      logoBase64 ? { base64: logoBase64, mime: logoMime } : undefined,
    );
    pdfBase64 = Buffer.from(pdfBytes).toString("base64");
  } catch {
    // Non-blocking
  }

  // ── Send rich offer email ────────────────────────────────────────────────
  try {
    if (offer.clientEmail) {
      const { sendEmailViaGraph, buildPartnerOfferEmail } = await import("@/lib/email");
      const { subject, htmlBody } = buildPartnerOfferEmail({
        candidateName: offer.clientName || "Candidate",
        candidateEmail: offer.clientEmail,
        offerNumber: offer.offerNumber,
        partnerName: partner?.name || offer.partnerName || "SCCG Partner",
        partnerLogoUrl: partner?.logoUrl,
        services: serviceDetails,
        totalAmount: offer.totalAmount,
        currency: secCur,
        rate,
        validUntil: offer.validUntil,
        notes: offer.notes,
        loginUrl: acceptUrl,
        loginPassword,
        acceptUrl,
        rejectUrl,
        serviceCategory: primaryCategory,
      });
      await sendEmailViaGraph({
        to: offer.clientEmail,
        toName: offer.clientName,
        subject,
        htmlBody,
        ...(pdfBase64
          ? {
              attachments: [
                {
                  name: `ServiceOffer-${offer.offerNumber}.pdf`,
                  contentType: "application/pdf",
                  contentBase64: pdfBase64,
                },
              ],
            }
          : {}),
      });
    }
  } catch {
    // Email is non-blocking
  }

  revalidatePath("/partner/offers");
  return { success: true };
}

export async function deletePartnerOffer(offerId: string) {
  const user = await requirePartner();
  const offer = await getSalesOfferById(offerId);
  if (!offer || offer.partnerId !== user.partnerId) throw new Error("Offer not found");

  await deleteSalesOffer(offerId);
  revalidatePath("/partner/offers");
  return { success: true };
}
