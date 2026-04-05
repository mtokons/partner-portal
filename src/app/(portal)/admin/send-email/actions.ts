"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { sendClientEmail, sendInvoiceEmail, sendSessionReminder } from "@/lib/powerautomate";

export async function sendEmailToClientAction(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  message: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const user = session.user as SessionUser;
  const result = await sendClientEmail({
    recipientEmail,
    recipientName,
    subject,
    htmlBody: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e40af;">${subject}</h2>
        <p>Dear ${recipientName},</p>
        <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;">
          ${message}
        </div>
        <p style="color:#6b7280;font-size:12px;">Sent by ${user.name} via Partner Portal</p>
      </div>
    `,
    senderName: user.name || "Partner Portal",
  });

  return result;
}

export async function sendInvoiceEmailAction(
  clientEmail: string,
  clientName: string,
  invoiceId: string,
  amount: number,
  dueDate: string,
  pdfUrl?: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  return sendInvoiceEmail(clientEmail, clientName, invoiceId, amount, dueDate, pdfUrl);
}

export async function sendSessionReminderAction(
  clientEmail: string,
  clientName: string,
  sessionDate: string,
  expertName: string,
  sessionNumber: number
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  return sendSessionReminder(clientEmail, clientName, sessionDate, expertName, sessionNumber);
}
