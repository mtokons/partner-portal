"use server";

/**
 * Candidate Portal Actions
 *
 * Server actions for logged-in candidates (customer role) to view their
 * offers, services, timeline, payment history, and send messages to partner.
 */

import { getEffectiveUser } from "@/lib/effective-user";
import type { SessionUser, Candidate, CandidateService, SalesOffer, SalesOfferItem, HelpdeskTicket, HelpdeskMessage } from "@/types";
import {
  getCandidates,
  getCandidateById,
  getCandidateServices,
  getSalesOffers,
  getSalesOfferById,
  getSalesOfferItems,
  getCustomerByEmail,
  updateSalesOffer,
  getPartners,
  createHelpdeskTicket,
  getHelpdeskTickets,
  getHelpdeskMessages,
  createHelpdeskMessage,
} from "@/lib/sharepoint";
import { generateSccgId } from "@/lib/sccg-id";
import { revalidatePath } from "next/cache";

export interface PartnerPaymentInfo {
  accountHolderName?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  accountNumber?: string;
  paymentNote?: string;
}

/**
 * Get payment info a partner has stored for candidates to use.
 * Stored in Firestore under partnerPaymentInfo/{partnerId}.
 */
export async function getPartnerPaymentInfo(partnerId: string): Promise<PartnerPaymentInfo | null> {
  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = getAdminFirestore();
    const doc = await db.collection("partnerPaymentInfo").doc(partnerId).get();
    if (!doc.exists) return null;
    return doc.data() as PartnerPaymentInfo;
  } catch {
    return null;
  }
}

/**
 * Accept an offer: mark it as accepted in SharePoint and notify all parties.
 */
export async function acceptOfferAction(offerId: string): Promise<{
  success: boolean;
  error?: string;
  paymentInfo?: PartnerPaymentInfo | null;
  alreadyRegistered?: boolean;
}> {
  try {
    const user = await requireCustomer();
    if (!user.email) return { success: false, error: "No email on session" };

    const offer = await getSalesOfferById(offerId);
    if (!offer) return { success: false, error: "Offer not found" };

    // Verify ownership
    const emailLower = user.email.toLowerCase().trim();
    const isOwner =
      offer.clientEmail?.toLowerCase().trim() === emailLower ||
      offer.prospectEmail?.toLowerCase().trim() === emailLower;
    if (!isOwner) return { success: false, error: "Access denied" };

    if (offer.status === "accepted") {
      return { success: false, error: "You have already accepted this offer." };
    }
    if (offer.status !== "sent") {
      return { success: false, error: "This offer is no longer available for acceptance." };
    }

    // Global duplicate check: check if this email already has a candidate record for this partner
    const existingCandidates = await getCandidates(offer.partnerId);
    const alreadyRegistered = existingCandidates.some(
      (c) => c.email.toLowerCase().trim() === emailLower
    );

    // Mark offer as accepted
    await updateSalesOffer(offerId, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    });

    // Fetch partner payment info and partner contact
    const [paymentInfo, partners] = await Promise.all([
      getPartnerPaymentInfo(offer.partnerId),
      getPartners(),
    ]);
    const partner = partners.find((p) => p.id === offer.partnerId);

    const candidateName = user.name || offer.clientName || "Candidate";
    const partnerName = offer.partnerName || partner?.name || "SCCG Partner";
    const totalAmount = offer.totalAmount;

    // Email to candidate
    try {
      const { sendEmailViaGraph } = await import("@/lib/email");
      await sendEmailViaGraph({
        to: user.email,
        toName: candidateName,
        subject: `Offer Accepted — ${offer.offerNumber} · SCCG`,
        htmlBody: buildOfferAcceptedCandidateEmail({
          candidateName,
          offerNumber: offer.offerNumber,
          partnerName,
          totalAmount,
          paymentInfo,
          partnerEmail: partner?.email,
          partnerPhone: partner?.phone,
        }),
      });
    } catch {
      // Non-fatal
    }

    // Email to partner
    try {
      if (partner?.email) {
        const { sendEmailViaGraph } = await import("@/lib/email");
        await sendEmailViaGraph({
          to: partner.email,
          toName: partnerName,
          subject: `Offer Accepted by ${candidateName} — ${offer.offerNumber}`,
          htmlBody: buildOfferAcceptedPartnerEmail({
            partnerName,
            candidateName,
            candidateEmail: user.email,
            offerNumber: offer.offerNumber,
            totalAmount,
            acceptedAt: new Date().toLocaleDateString("en-GB"),
          }),
        });
      }
    } catch {
      // Non-fatal
    }

    revalidatePath(`/customer/offers/${offerId}`);
    revalidatePath("/customer/offers");
    return { success: true, paymentInfo, alreadyRegistered };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

/**
 * Request a new/revised offer — sends an email to the partner.
 */
export async function requestNewOfferAction(offerId: string, message: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requireCustomer();
    if (!user.email) return { success: false, error: "No email on session" };

    const offer = await getSalesOfferById(offerId);
    if (!offer) return { success: false, error: "Offer not found" };

    const emailLower = user.email.toLowerCase().trim();
    const isOwner =
      offer.clientEmail?.toLowerCase().trim() === emailLower ||
      offer.prospectEmail?.toLowerCase().trim() === emailLower;
    if (!isOwner) return { success: false, error: "Access denied" };

    // Get partner contact details
    const partners = await getPartners();
    const partner = partners.find((p) => p.id === offer.partnerId);
    if (!partner?.email) return { success: false, error: "Partner contact not found" };

    const candidateName = user.name || offer.clientName || user.email;
    const partnerName = offer.partnerName || partner.name || "Partner";

    const { sendEmailViaGraph } = await import("@/lib/email");
    await sendEmailViaGraph({
      to: partner.email,
      toName: partnerName,
      subject: `New Offer Request from ${candidateName} — Re: ${offer.offerNumber}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Offer Request</h1>
            <p style="color: #94a3b8; margin: 6px 0 0;">Re: Offer ${offer.offerNumber}</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Dear <strong>${partnerName}</strong>,</p>
            <p>Your candidate <strong>${candidateName}</strong> (${user.email}) has requested a new or revised offer for <strong>${offer.offerNumber}</strong>.</p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Message from candidate:</strong></p>
              <p style="margin: 8px 0 0; color: #475569;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Please log into the SCCG Partner Portal to create a revised offer.<br/>— SCCG Career Lab Germany</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send request" };
  }
}

// ─── Email builders ───────────────────────────────────────────────────────────

function buildOfferAcceptedCandidateEmail(data: {
  candidateName: string;
  offerNumber: string;
  partnerName: string;
  totalAmount: number;
  paymentInfo?: PartnerPaymentInfo | null;
  partnerEmail?: string;
  partnerPhone?: string;
}): string {
  const paymentSection = data.paymentInfo && Object.values(data.paymentInfo).some(Boolean)
    ? `
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #15803d;">Payment Details</h3>
        <p style="margin: 0 0 8px; font-size: 13px; color: #166534;">Please transfer <strong>€${data.totalAmount.toFixed(2)}</strong> to your partner using the details below:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${data.paymentInfo.accountHolderName ? `<tr><td style="padding: 5px 0; color: #6b7280; width: 160px;">Account Holder</td><td style="padding: 5px 0; font-weight: bold;">${data.paymentInfo.accountHolderName}</td></tr>` : ""}
          ${data.paymentInfo.bankName ? `<tr><td style="padding: 5px 0; color: #6b7280;">Bank Name</td><td style="padding: 5px 0;">${data.paymentInfo.bankName}</td></tr>` : ""}
          ${data.paymentInfo.iban ? `<tr><td style="padding: 5px 0; color: #6b7280;">IBAN</td><td style="padding: 5px 0; font-family: monospace; font-weight: bold;">${data.paymentInfo.iban}</td></tr>` : ""}
          ${data.paymentInfo.bic ? `<tr><td style="padding: 5px 0; color: #6b7280;">BIC / SWIFT</td><td style="padding: 5px 0; font-family: monospace;">${data.paymentInfo.bic}</td></tr>` : ""}
          ${data.paymentInfo.accountNumber ? `<tr><td style="padding: 5px 0; color: #6b7280;">Account Number</td><td style="padding: 5px 0; font-family: monospace;">${data.paymentInfo.accountNumber}</td></tr>` : ""}
          ${data.paymentInfo.paymentNote ? `<tr><td style="padding: 5px 0; color: #6b7280; vertical-align: top;">Instructions</td><td style="padding: 5px 0;">${data.paymentInfo.paymentNote}</td></tr>` : ""}
        </table>
      </div>
    `
    : `
      <div style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">Your partner has not yet set up their payment details in the portal. Please contact <strong>${data.partnerName}</strong> directly${data.partnerEmail ? ` at <a href="mailto:${data.partnerEmail}" style="color: #d97706;">${data.partnerEmail}</a>` : ""}${data.partnerPhone ? ` or ${data.partnerPhone}` : ""} to arrange payment.</p>
      </div>
    `;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Offer Accepted</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">Offer #${data.offerNumber}</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Dear <strong>${data.candidateName}</strong>,</p>
        <p>Congratulations! You have successfully accepted the offer <strong>${data.offerNumber}</strong> from <strong>${data.partnerName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 20px 0;">
          <tr><td style="padding: 12px 16px; color: #64748b; width: 140px;">Offer Number</td><td style="padding: 12px 16px; font-weight: bold;">${data.offerNumber}</td></tr>
          <tr style="background: #f1f5f9;"><td style="padding: 12px 16px; color: #64748b;">Partner</td><td style="padding: 12px 16px;">${data.partnerName}</td></tr>
          <tr><td style="padding: 12px 16px; color: #64748b;">Total Amount</td><td style="padding: 12px 16px; font-weight: bold; color: #0284c7;">€${data.totalAmount.toFixed(2)}</td></tr>
        </table>
        ${paymentSection}
        <p>Your partner will complete your registration and you will receive further instructions shortly.</p>
        <p>You can track your service progress in the SCCG Partner Portal at any time.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Best regards,<br/><strong>SCCG Career Lab Germany</strong><br/><a href="https://www.mysccg.de/" style="color: #2563eb;">www.mysccg.de</a></p>
      </div>
    </div>
  `;
}

function buildOfferAcceptedPartnerEmail(data: {
  partnerName: string;
  candidateName: string;
  candidateEmail: string;
  offerNumber: string;
  totalAmount: number;
  acceptedAt: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f4c35, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Offer Accepted!</h1>
        <p style="color: #bbf7d0; margin: 8px 0 0;">A candidate has accepted your offer</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Dear <strong>${data.partnerName}</strong>,</p>
        <p>Great news! <strong>${data.candidateName}</strong> has accepted your offer and is ready to proceed.</p>
        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; margin: 20px 0;">
          <tr><td style="padding: 12px 16px; color: #64748b; width: 150px;">Candidate</td><td style="padding: 12px 16px; font-weight: bold;">${data.candidateName}</td></tr>
          <tr style="background: #f1f5f9;"><td style="padding: 12px 16px; color: #64748b;">Email</td><td style="padding: 12px 16px;"><a href="mailto:${data.candidateEmail}" style="color: #2563eb;">${data.candidateEmail}</a></td></tr>
          <tr><td style="padding: 12px 16px; color: #64748b;">Offer Number</td><td style="padding: 12px 16px; font-family: monospace;">${data.offerNumber}</td></tr>
          <tr style="background: #f1f5f9;"><td style="padding: 12px 16px; color: #64748b;">Total Amount</td><td style="padding: 12px 16px; font-weight: bold; color: #0284c7;">€${data.totalAmount.toFixed(2)}</td></tr>
          <tr><td style="padding: 12px 16px; color: #64748b;">Accepted On</td><td style="padding: 12px 16px;">${data.acceptedAt}</td></tr>
        </table>
        <p><strong>Next steps:</strong> Please log into the SCCG Partner Portal to complete the candidate's registration and set up their service timeline.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Career Lab Germany<br/><a href="https://portal.mysccg.de" style="color: #2563eb;">portal.mysccg.de</a></p>
      </div>
    </div>
  `;
}

async function requireCustomer(): Promise<SessionUser> {
  const user = await getEffectiveUser();
  if (!user) throw new Error("Unauthorized");
  const roles = user.roles || [user.role];
  if (!roles.includes("customer")) throw new Error("Not a customer");
  return user;
}

/**
 * Get the candidate record(s) for the logged-in user (matched by email).
 */
export async function getMyCandidateRecords(): Promise<Candidate[]> {
  const user = await requireCustomer();
  if (!user.email) return [];

  // Fetch ALL candidates and filter by email (candidate email = user email)
  const allCandidates = await getCandidates();
  return allCandidates.filter(
    (c) => c.email.toLowerCase().trim() === user.email!.toLowerCase().trim()
  );
}

/**
 * Get services for a candidate (verifying the candidate belongs to logged-in user).
 */
export async function getMyCandidateServices(candidateId: string): Promise<CandidateService[]> {
  const user = await requireCustomer();
  const candidate = await getCandidateById(candidateId);
  if (!candidate) return [];
  if (candidate.email.toLowerCase().trim() !== user.email!.toLowerCase().trim()) return [];
  return getCandidateServices(candidateId);
}

/**
 * Get all offers sent to the logged-in user's email.
 */
export async function getMyOffers(): Promise<SalesOffer[]> {
  const user = await requireCustomer();
  if (!user.email) return [];

  const emailLower = user.email.toLowerCase().trim();

  // Try to get offers via customer's partner first
  const customer = await getCustomerByEmail(user.email);
  if (customer) {
    const partnerOffers = await getSalesOffers(customer.partnerId);
    const matched = partnerOffers.filter(
      (o) =>
        o.clientEmail?.toLowerCase().trim() === emailLower ||
        o.prospectEmail?.toLowerCase().trim() === emailLower
    );
    if (matched.length > 0) return matched;
  }

  // Fallback: scan all offers (for candidates without a customer record yet)
  const allOffers = await getSalesOffers();
  return allOffers.filter(
    (o) =>
      o.clientEmail?.toLowerCase().trim() === emailLower ||
      o.prospectEmail?.toLowerCase().trim() === emailLower
  );
}

/**
 * Get offer details (items) for a specific offer.
 */
export async function getMyOfferDetail(offerId: string): Promise<{
  offer: SalesOffer;
  items: SalesOfferItem[];
} | null> {
  const user = await requireCustomer();
  const offer = await getSalesOfferById(offerId);
  if (!offer) return null;

  // Verify offer belongs to this user
  const isOwner =
    offer.clientEmail?.toLowerCase().trim() === user.email!.toLowerCase().trim() ||
    offer.prospectEmail?.toLowerCase().trim() === user.email!.toLowerCase().trim();
  if (!isOwner) return null;

  const items = await getSalesOfferItems(offerId);
  return { offer, items };
}

/**
 * Determine the candidate's portal context:
 * - "offer-only": has offers but no purchased plan/service
 * - "active": has purchased services/plans
 * - "empty": no offers or services
 */
export async function getCandidatePortalContext(): Promise<{
  context: "offer-only" | "active" | "empty";
  candidates: Candidate[];
  offers: SalesOffer[];
  hasServices: boolean;
}> {
  const user = await requireCustomer();
  if (!user.email) return { context: "empty", candidates: [], offers: [], hasServices: false };

  const [candidates, offers] = await Promise.all([
    getMyCandidateRecords(),
    getMyOffers(),
  ]);

  // Check if any candidate has services
  let hasServices = false;
  for (const c of candidates) {
    const services = await getCandidateServices(c.id);
    if (services.length > 0) {
      hasServices = true;
      break;
    }
  }

  if (hasServices || candidates.length > 0) {
    return { context: "active", candidates, offers, hasServices };
  }

  if (offers.length > 0) {
    return { context: "offer-only", candidates, offers, hasServices: false };
  }

  return { context: "empty", candidates, offers, hasServices: false };
}

/**
 * Get helpdesk tickets for candidate→partner direct messaging.
 */
export async function getMyMessages(): Promise<HelpdeskTicket[]> {
  const user = await requireCustomer();
  if (!user.email) return [];

  const allTickets = await getHelpdeskTickets();
  return allTickets.filter(
    (t) => t.submittedByEmail.toLowerCase().trim() === user.email!.toLowerCase().trim()
  );
}

/**
 * Get messages in a specific ticket/conversation.
 */
export async function getMyConversation(ticketId: string): Promise<{
  ticket: HelpdeskTicket | null;
  messages: HelpdeskMessage[];
}> {
  const user = await requireCustomer();
  const allTickets = await getHelpdeskTickets();
  const ticket = allTickets.find((t) => t.id === ticketId);

  if (!ticket) return { ticket: null, messages: [] };
  if (ticket.submittedByEmail.toLowerCase().trim() !== user.email!.toLowerCase().trim()) {
    return { ticket: null, messages: [] };
  }

  const messages = await getHelpdeskMessages(ticketId);
  return { ticket, messages };
}

/**
 * Create a new message/query from candidate to their partner.
 */
export async function sendMessageToPartner(data: {
  subject: string;
  message: string;
  candidateId?: string;
}): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const user = await requireCustomer();
    if (!user.email) return { success: false, error: "No email" };

    // Find the partner this candidate belongs to
    const candidates = await getMyCandidateRecords();
    const partnerId = candidates[0]?.partnerId || "";

    const sccgId = await generateSccgId("HLP");

    const ticket = await createHelpdeskTicket({
      sccgId,
      submittedByUserId: user.id,
      submittedByName: user.name || user.email,
      submittedByEmail: user.email,
      partnerId,
      category: "candidate",
      priority: "regular",
      subject: data.subject,
      description: data.message,
      status: "open",
      relatedCandidateId: data.candidateId,
      createdAt: new Date().toISOString(),
    });

    // Send email notification to partner
    try {
      if (partnerId) {
        const { getPartners } = await import("@/lib/sharepoint");
        const partners = await getPartners();
        const partner = partners.find((p) => p.id === partnerId);
        if (partner?.email) {
          const { sendEmailViaGraph } = await import("@/lib/email");
          await sendEmailViaGraph({
            to: partner.email,
            toName: partner.name,
            subject: `New Message from ${user.name || user.email} — ${data.subject}`,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h2 style="color: #ffffff; margin: 0;">New Candidate Message</h2>
                </div>
                <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                  <p><strong>From:</strong> ${user.name || user.email}</p>
                  <p><strong>Subject:</strong> ${data.subject}</p>
                  <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
                  </div>
                  <p style="color: #64748b; font-size: 13px;">Please log in to the portal to reply.</p>
                </div>
              </div>
            `,
          });
        }
      }
    } catch {
      // Email notification is non-blocking
    }

    revalidatePath("/customer/messages");
    return { success: true, ticketId: ticket.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send" };
  }
}

/**
 * Reply to an existing conversation.
 */
export async function replyToConversation(
  ticketId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireCustomer();

    // Verify ticket ownership
    const allTickets = await getHelpdeskTickets();
    const ticket = allTickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.submittedByEmail.toLowerCase() !== user.email!.toLowerCase()) {
      return { success: false, error: "Ticket not found" };
    }

    await createHelpdeskMessage({
      ticketId,
      senderUserId: user.id,
      senderName: user.name || user.email!,
      isStaff: false,
      message,
      createdAt: new Date().toISOString(),
    });

    revalidatePath(`/customer/messages/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reply" };
  }
}
