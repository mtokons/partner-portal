"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, createInvoice, getInvoiceById, updateInvoice } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createPartnerInvoice(data: {
  clientName: string;
  amount: number;
  description?: string;
  dueDate: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Not a partner");

  if (!data.clientName?.trim()) throw new Error("Client name is required");
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than 0");
  if (!data.dueDate) throw new Error("Due date is required");

  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  await createInvoice({
    partnerId: partner.id,
    clientId: "",
    clientName: data.clientName.trim(),
    invoiceNumber,
    amount: data.amount,
    status: "draft",
    dueDate: data.dueDate,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/partner/finance/invoices");
  return { success: true, invoiceNumber };
}

export async function sendInvoiceToClientAction(invoiceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Not a partner");

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  // Generate PDF bytes for attachment
  const { generateInvoicePdfBytes } = await import("@/lib/engine/invoice-pdf");
  const pdfBytes = generateInvoicePdfBytes(invoice, partner);
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  // Determine recipient email — from invoice clientId or client name lookup
  let recipientEmail: string | undefined;

  // Try to find email from invoice's clientId (if it maps to a candidate)
  if (invoice.clientId) {
    try {
      const { getCandidateById } = await import("@/lib/sharepoint");
      const candidate = await getCandidateById(invoice.clientId);
      if (candidate?.email) recipientEmail = candidate.email;
    } catch {
      // Skip if lookup fails
    }
  }

  // Fallback: search candidates by name
  if (!recipientEmail && invoice.clientName) {
    try {
      const { getCandidates } = await import("@/lib/sharepoint");
      const candidates = await getCandidates(partner.id);
      const match = candidates.find(
        (c) => c.fullName?.toLowerCase().trim() === invoice.clientName?.toLowerCase().trim()
          || c.email?.toLowerCase().trim() === invoice.clientName?.toLowerCase().trim()
      );
      if (match?.email) recipientEmail = match.email;
    } catch {
      // Skip if candidate lookup fails
    }
  }

  if (!recipientEmail) {
    throw new Error("Could not find client email. Please add email to client record.");
  }

  // Send via Graph email with PDF attachment
  const { sendEmailViaGraph } = await import("@/lib/email");
  await sendEmailViaGraph({
    to: recipientEmail,
    toName: invoice.clientName || "Client",
    subject: `Invoice from SCCG Career Lab Germany (Invoice No: ${invoice.invoiceNumber || invoiceId.slice(0, 8)})`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Invoice</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">Invoice #${invoice.invoiceNumber || invoiceId.slice(0, 8)}</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${invoice.clientName}</strong>,</p>
          <p>Please find attached your invoice for <strong>€${invoice.amount.toFixed(2)}</strong>.</p>
          <p>Due Date: <strong>${invoice.dueDate}</strong></p>
          <p>Please download the attached PDF for full details.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Career Lab Germany</p>
        </div>
      </div>
    `,
    attachments: [
      {
        name: `Invoice-${invoice.invoiceNumber || invoiceId.slice(0, 8)}.pdf`,
        contentType: "application/pdf",
        contentBase64: pdfBase64,
      },
    ],
  });

  // Update invoice status to "sent"
  await updateInvoice(invoiceId, { status: "sent", updatedAt: new Date().toISOString() });

  revalidatePath("/partner/finance/invoices");
  return { success: true };
}
