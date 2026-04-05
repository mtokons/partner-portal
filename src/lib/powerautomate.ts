type FlowEvent =
  | "order-placed"
  | "payment-confirmed"
  | "installment-due"
  | "payment-overdue"
  | "partner-registered"
  | "partner-status-changed"
  | "monthly-summary"
  | "send-client-email"
  | "session-reminder"
  | "invoice-created";

const webhookMap: Record<FlowEvent, string | undefined> = {
  "order-placed": process.env.PA_WEBHOOK_ORDER_PLACED,
  "payment-confirmed": process.env.PA_WEBHOOK_PAYMENT_CONFIRMED,
  "installment-due": process.env.PA_WEBHOOK_INSTALLMENT_DUE,
  "payment-overdue": process.env.PA_WEBHOOK_PAYMENT_OVERDUE,
  "partner-registered": process.env.PA_WEBHOOK_PARTNER_REGISTERED,
  "partner-status-changed": process.env.PA_WEBHOOK_PARTNER_STATUS_CHANGED,
  "monthly-summary": process.env.PA_WEBHOOK_MONTHLY_SUMMARY,
  "send-client-email": process.env.PA_WEBHOOK_SEND_CLIENT_EMAIL,
  "session-reminder": process.env.PA_WEBHOOK_SESSION_REMINDER,
  "invoice-created": process.env.PA_WEBHOOK_INVOICE_CREATED,
};

export async function triggerFlow(
  event: FlowEvent,
  payload: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const url = webhookMap[event];

  if (!url) {
    console.log(`[PowerAutomate] No webhook URL configured for event: ${event}. Skipping.`);
    return { success: false, message: `No webhook URL configured for ${event}` };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload }),
    });

    if (!res.ok) {
      console.error(`[PowerAutomate] Flow ${event} returned ${res.status}`);
      return { success: false, message: `Flow returned status ${res.status}` };
    }

    console.log(`[PowerAutomate] Flow ${event} triggered successfully`);
    return { success: true, message: "Flow triggered" };
  } catch (err) {
    console.error(`[PowerAutomate] Error triggering ${event}:`, err);
    return { success: false, message: String(err) };
  }
}

export interface ClientEmailPayload {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlBody: string;
  senderName?: string;
  attachmentUrl?: string;
}

export async function sendClientEmail(payload: ClientEmailPayload): Promise<{ success: boolean; message: string }> {
  return triggerFlow("send-client-email", {
    toEmail: payload.recipientEmail,
    toName: payload.recipientName,
    subject: payload.subject,
    body: payload.htmlBody,
    senderName: payload.senderName || "Partner Portal",
    attachmentUrl: payload.attachmentUrl,
  });
}

export async function sendInvoiceEmail(
  clientEmail: string,
  clientName: string,
  invoiceId: string,
  amount: number,
  dueDate: string,
  pdfUrl?: string
): Promise<{ success: boolean; message: string }> {
  return sendClientEmail({
    recipientEmail: clientEmail,
    recipientName: clientName,
    subject: `Invoice ${invoiceId} — Payment Due ${dueDate}`,
    htmlBody: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e40af;">Invoice Notification</h2>
        <p>Dear ${clientName},</p>
        <p>A new invoice has been created for your account:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Invoice ID</td><td style="padding:8px;border:1px solid #e5e7eb;">${invoiceId}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;">BDT ${amount.toLocaleString()}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Due Date</td><td style="padding:8px;border:1px solid #e5e7eb;">${dueDate}</td></tr>
        </table>
        <p>Please ensure timely payment to avoid any late fees.</p>
        <p style="color:#6b7280;font-size:12px;">This email was sent automatically by Partner Portal.</p>
      </div>
    `,
    attachmentUrl: pdfUrl,
  });
}

export async function sendSessionReminder(
  clientEmail: string,
  clientName: string,
  sessionDate: string,
  expertName: string,
  sessionNumber: number
): Promise<{ success: boolean; message: string }> {
  return triggerFlow("session-reminder", {
    toEmail: clientEmail,
    toName: clientName,
    subject: `Session Reminder — Session #${sessionNumber} on ${sessionDate}`,
    body: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#0d9488;">Session Reminder</h2>
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder for your upcoming session:</p>
        <ul style="line-height:2;">
          <li><strong>Session:</strong> #${sessionNumber}</li>
          <li><strong>Date:</strong> ${sessionDate}</li>
          <li><strong>Expert:</strong> ${expertName}</li>
        </ul>
        <p>Please be prepared and join on time.</p>
        <p style="color:#6b7280;font-size:12px;">This email was sent automatically by Partner Portal.</p>
      </div>
    `,
    expertName,
    sessionNumber,
  });
}
