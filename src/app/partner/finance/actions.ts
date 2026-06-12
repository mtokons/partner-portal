"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { sendEmailViaGraph } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { getEurToRate } from "@/lib/currency";
import { dualHtml } from "@/lib/formatCurrency";

export async function sendPaymentReminderAction(candidateId: string, candidateName: string, candidateEmail: string, dueAmount: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Not a partner");

  if (!candidateEmail) throw new Error("Client has no email address");

  const secCur = partner.preferredCurrency || "BDT";
  const rate = secCur !== "EUR" ? await getEurToRate(secCur) : 1;
  const amountDisplay = dualHtml(dueAmount, secCur, rate);

  const subject = `Payment Reminder — Outstanding Balance of €${dueAmount.toFixed(2)}`;
  const body = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 24px; border-radius: 16px 16px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 20px;">Payment Reminder</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">SCCG Partner Portal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <p style="color: #334155; font-size: 15px;">Dear <strong>${candidateName}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          This is a friendly reminder that you have an outstanding balance of 
          ${amountDisplay}
          for services provided through SCCG.
        </p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b;">Partner:</td><td style="text-align: right; font-weight: 600;">${partner.company || partner.name}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Amount Due:</td><td style="text-align: right; font-weight: 600; color: #dc2626;">${amountDisplay}</td></tr>
          </table>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Please arrange payment at your earliest convenience. If you have already made this payment, 
          please disregard this reminder.
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
          Best regards,<br/>
          <strong>${partner.name}</strong><br/>
          ${partner.company || "SCCG Partner"}
        </p>
      </div>
    </div>
  `;

  await sendEmailViaGraph({
    to: candidateEmail,
    subject,
    htmlBody: body,
  });

  revalidatePath("/partner/finance");
  return { success: true };
}

export async function sendPaymentConfirmationAction(candidateId: string, candidateName: string, candidateEmail: string, amount: number, method: string, plan: string, paymentDate: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Not a partner");

  if (!candidateEmail) throw new Error("Client has no email address");

  const { buildPaymentConfirmationEmail } = await import("@/lib/email");

  const emailContent = buildPaymentConfirmationEmail({
    clientName: candidateName,
    partnerName: partner.company || partner.name,
    paymentDate: paymentDate,
    amount,
    method,
    plan,
  });

  await sendEmailViaGraph({
    to: candidateEmail,
    subject: emailContent.subject,
    htmlBody: emailContent.htmlBody,
  });

  revalidatePath("/partner/finance");
  return { success: true };
}
