/**
 * Office 365 Email Sender — Microsoft Graph API
 *
 * Sends emails through the organization's M365 tenant.
 * Requires Azure AD app with Mail.Send permission.
 */

import { graphPost } from "./graph";

const DEFAULT_SENDER = process.env.O365_SENDER_USER_ID || "admin@mysccg.de";

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
  senderUserId?: string; // Override sender mailbox
  cc?: Array<{ email: string; name?: string }>;
  saveToSentItems?: boolean;
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentBase64: string;
}

/**
 * Send an email via Microsoft Graph API / Office 365.
 */
export async function sendEmailViaGraph(params: SendEmailParams): Promise<void> {
  const sender = params.senderUserId || DEFAULT_SENDER;

  const toRecipients = [
    {
      emailAddress: {
        address: params.to,
        name: params.toName || params.to,
      },
    },
  ];

  const ccRecipients = (params.cc || []).map((c) => ({
    emailAddress: { address: c.email, name: c.name || c.email },
  }));

  const attachmentsList = (params.attachments || []).map((a) => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: a.name,
    contentType: a.contentType,
    contentBytes: a.contentBase64,
  }));

  const body: Record<string, unknown> = {
    message: {
      subject: params.subject,
      body: {
        contentType: "HTML",
        content: params.htmlBody,
      },
      toRecipients,
      ...(ccRecipients.length > 0 && { ccRecipients }),
      ...(attachmentsList.length > 0 && { attachments: attachmentsList }),
    },
    saveToSentItems: params.saveToSentItems !== false,
  };

  await graphPost(`/users/${sender}/sendMail`, body);
}

// ── Email Templates ──

export function buildWelcomeCustomerEmail(data: {
  customerName: string;
  sccgId: string;
  loginUrl: string;
  tempPassword: string;
  partnerName: string;
}): { subject: string; htmlBody: string } {
  return {
    subject: "Welcome to SCCG Career Lab Germany — Your Account is Ready",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to SCCG</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">Your account has been created</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.customerName}</strong>,</p>
          <p>Your SCCG Portal account has been set up by <strong>${data.partnerName}</strong>.</p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Customer ID</td><td style="padding: 8px 0; font-weight: bold;">${data.sccgId}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Login URL</td><td style="padding: 8px 0;"><a href="${data.loginUrl}">${data.loginUrl}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Temporary Password</td><td style="padding: 8px 0; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${data.tempPassword}</td></tr>
          </table>
          <p style="color: #ef4444; font-size: 14px;">⚠️ Please change your password after first login.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Portal Team</p>
        </div>
      </div>
    `,
  };
}

export function buildWelcomeEmployeeEmail(data: {
  employeeName: string;
  sccgId: string;
  designation: string;
  department: string;
  joiningDate: string;
  managerName?: string;
}): { subject: string; htmlBody: string } {
  return {
    subject: `Welcome to SCCG Career Lab Germany — ${data.designation}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to the Team!</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG — Human Resources</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          <p>We are pleased to welcome you to SCCG.</p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Employee ID</td><td style="padding: 8px 0; font-weight: bold;">${data.sccgId}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Designation</td><td style="padding: 8px 0;">${data.designation}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Department</td><td style="padding: 8px 0;">${data.department}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Joining Date</td><td style="padding: 8px 0;">${data.joiningDate}</td></tr>
            ${data.managerName ? `<tr><td style="padding: 8px 0; color: #64748b;">Reports To</td><td style="padding: 8px 0;">${data.managerName}</td></tr>` : ""}
          </table>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Human Resources</p>
        </div>
      </div>
    `,
  };
}

export function buildEnrollmentConfirmationEmail(data: {
  studentName: string;
  courseName: string;
  batchCode: string;
  schedule: string;
  teacherName: string;
  startDate: string;
  totalFee: number;
}): { subject: string; htmlBody: string } {
  return {
    subject: `Enrollment Confirmed — SCCG Career Lab Germany (${data.courseName}, ${data.batchCode})`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Enrollment Confirmed</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Language School</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.studentName}</strong>,</p>
          <p>You have been enrolled in the following course:</p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Course</td><td style="padding: 8px 0; font-weight: bold;">${data.courseName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Batch</td><td style="padding: 8px 0;">${data.batchCode}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Schedule</td><td style="padding: 8px 0;">${data.schedule}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Teacher</td><td style="padding: 8px 0;">${data.teacherName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Start Date</td><td style="padding: 8px 0;">${data.startDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Total Fee</td><td style="padding: 8px 0;">৳${data.totalFee.toLocaleString()}</td></tr>
          </table>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Language School</p>
        </div>
      </div>
    `,
  };
}

export function buildCertificateEmail(data: {
  studentName: string;
  certificateType: string;
  courseName: string;
  certificateNumber: string;
  verificationUrl: string;
}): { subject: string; htmlBody: string } {
  return {
    subject: `Your Certificate is Ready — SCCG Career Lab Germany (${data.courseName})`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 Certificate Issued</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Language School</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.studentName}</strong>,</p>
          <p>Congratulations! Your <strong>${data.certificateType}</strong> has been issued.</p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Course</td><td style="padding: 8px 0; font-weight: bold;">${data.courseName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Certificate No.</td><td style="padding: 8px 0; font-family: monospace;">${data.certificateNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Verify</td><td style="padding: 8px 0;"><a href="${data.verificationUrl}">${data.verificationUrl}</a></td></tr>
          </table>
          <p>The PDF certificate is attached to this email.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Language School</p>
        </div>
      </div>
    `,
  };
}

export function buildResultsPublishedEmail(data: {
  studentName: string;
  courseName: string;
  batchCode: string;
  examName: string;
}): { subject: string; htmlBody: string } {
  return {
    subject: `Exam Results Published — SCCG Career Lab Germany (${data.courseName})`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Exam Results</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Language School</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.studentName}</strong>,</p>
          <p>Results for <strong>${data.examName}</strong> (${data.courseName} — ${data.batchCode}) have been published.</p>
          <p>Please log in to your student portal to view your results.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Language School</p>
        </div>
      </div>
    `,
  };
}

export function buildPaymentConfirmationEmail(data: {
  clientName: string;
  partnerName: string;
  paymentDate: string;
  amount: number;
  method: string;
  plan: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
}): { subject: string; htmlBody: string } {
  const { dualHtml } = require("@/lib/formatCurrency");
  const amountDisplay = data.secondaryCurrency && data.exchangeRate
    ? dualHtml(data.amount, data.secondaryCurrency, data.exchangeRate)
    : `€${data.amount.toFixed(2)}`;
  return {
    subject: `Payment Confirmation — SCCG Career Lab Germany (${data.plan})`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">Payment Confirmation</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">SCCG Partner Portal</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>\${data.clientName}</strong>,</p>
          <p>Thank you for choosing SCCG: Study and Career Coach Germany! We are pleased to confirm that we have received your payment for the (\${data.plan}) on \${data.paymentDate}.</p>
          <h3 style="margin-top: 24px; color: #334155;">Payment Details:</h3>
          <table style="width: 100%; margin: 12px 0 24px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Paid Amount:</td><td style="padding: 8px 0; font-weight: bold;">${amountDisplay}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Payment Method:</td><td style="padding: 8px 0;">\${data.method}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">SCCG Plan:</td><td style="padding: 8px 0;">\${data.plan}</td></tr>
          </table>
          <p>We are currently organizing a professional session with one of our experts tailored to your needs. You will receive a meeting invitation within the next 10 days.</p>
          <p>In the meantime, if you have any questions, please feel free to reach out by email or WhatsApp at +4915905840718.</p>
          <p>Thank you again for your payment and trust in SCCG. We look forward to supporting your career journey!</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
            Best Regards,<br/>
            <strong>\${data.partnerName}</strong><br/>
            Study and Career Coach Germany<br/>
            Website: <a href="https://www.mysccg.de/" style="color: #2563eb;">https://www.mysccg.de/</a>
          </p>
        </div>
      </div>
    `,
  };
}

export function buildCandidateLoginEmail(data: {
  candidateName: string;
  sccgId: string;
  email: string;
  tempPassword?: string;
  partnerName: string;
  workflowCategory: string;
  loginUrl: string;
  totalServiceFee?: number;
}): { subject: string; htmlBody: string } {
  const passwordSection = data.tempPassword
    ? `
      <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #b45309;">🔐 Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Email</td><td style="padding: 6px 0; font-weight: bold;">${data.email}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Temporary Password</td><td style="padding: 6px 0; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 15px; letter-spacing: 1px;">${data.tempPassword}</td></tr>
        </table>
        <p style="color: #dc2626; font-size: 13px; margin: 12px 0 0;">⚠️ Please change your password after your first login for security.</p>
      </div>`
    : `
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px;">✓ You already have an account. Please log in with your existing credentials.</p>
      </div>`;

  const feeSection = data.totalServiceFee
    ? `<tr><td style="padding: 8px 0; color: #64748b;">Total Service Fee</td><td style="padding: 8px 0; font-weight: bold;">€${data.totalServiceFee.toFixed(2)}</td></tr>`
    : "";

  return {
    subject: `Welcome to SCCG Career Lab Germany — Your Portal Login Details`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to SCCG Career Lab Germany</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">Your Portal Account is Ready</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.candidateName}</strong>,</p>
          <p>You have been registered by <strong>${data.partnerName}</strong> for the <strong>${data.workflowCategory}</strong> program.</p>
          
          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Registration ID</td><td style="padding: 8px 0; font-weight: bold;">${data.sccgId}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Program</td><td style="padding: 8px 0;">${data.workflowCategory}</td></tr>
            ${feeSection}
          </table>

          ${passwordSection}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Log In to Your Portal</a>
          </div>

          <p>After logging in, you can:</p>
          <ul style="color: #334155; line-height: 1.8;">
            <li>✓ View your service offers and details</li>
            <li>✓ Track your application timeline</li>
            <li>✓ View payment history</li>
            <li>✓ Send messages to your partner</li>
            <li>✓ Upload required documents</li>
          </ul>
          
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
            Best regards,<br/>
            <strong>SCCG Career Lab Germany</strong><br/>
            Website: <a href="https://www.mysccg.de/" style="color: #2563eb;">www.mysccg.de</a>
          </p>
        </div>
      </div>
    `,
  };
}
