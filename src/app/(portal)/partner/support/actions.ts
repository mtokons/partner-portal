"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import {
  createHelpdeskTicket,
  updateHelpdeskTicket,
  createHelpdeskMessage,
} from "@/lib/sharepoint";
import { generateSccgId } from "@/lib/sccg-id";
import type { HelpdeskTicketCategory, HelpdeskTicketPriority } from "@/types";

export async function createHelpdeskTicketAction(data: {
  category: HelpdeskTicketCategory;
  priority: HelpdeskTicketPriority;
  subject: string;
  description: string;
  partnerId: string;
  relatedCandidateId?: string;
}) {
  const user = await requirePermission("helpdesk.ticket.create");
  const sccgId = await generateSccgId("HLP");

  const ticket = await createHelpdeskTicket({
    sccgId,
    submittedByUserId: user.id,
    submittedByName: user.name ?? "",
    submittedByEmail: user.email ?? "",
    partnerId: data.partnerId,
    category: data.category,
    priority: data.priority,
    status: "open",
    subject: data.subject,
    description: data.description,
    relatedCandidateId: data.relatedCandidateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/partner/support");
  return ticket;
}

export async function createHelpdeskMessageAction(
  ticketId: string,
  message: string
) {
  const user = await requirePermission("helpdesk.ticket.create");

  const msg = await createHelpdeskMessage({
    ticketId,
    senderUserId: user.id,
    senderName: user.name ?? "",
    isStaff: (user.roles || [user.role]).includes("admin"),
    message,
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/partner/support/${ticketId}`);
  return msg;
}

export async function resolveTicketAction(ticketId: string) {
  await requirePermission("helpdesk.ticket.respond");
  await updateHelpdeskTicket(ticketId, {
    status: "resolved",
    resolvedAt: new Date().toISOString(),
  });
  revalidatePath(`/partner/support/${ticketId}`);
  revalidatePath("/partner/support");
}
