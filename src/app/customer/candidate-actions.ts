"use server";

/**
 * Candidate Portal Actions
 *
 * Server actions for logged-in candidates (customer role) to view their
 * offers, services, timeline, payment history, and send messages to partner.
 */

import { auth } from "@/auth";
import type { SessionUser, Candidate, CandidateService, SalesOffer, SalesOfferItem, HelpdeskTicket, HelpdeskMessage } from "@/types";
import {
  getCandidates,
  getCandidateById,
  getCandidateServices,
  getSalesOffers,
  getSalesOfferById,
  getSalesOfferItems,
  getCustomerByEmail,
  createHelpdeskTicket,
  getHelpdeskTickets,
  getHelpdeskMessages,
  createHelpdeskMessage,
} from "@/lib/sharepoint";
import { generateSccgId } from "@/lib/sccg-id";
import { revalidatePath } from "next/cache";

async function requireCustomer(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
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
