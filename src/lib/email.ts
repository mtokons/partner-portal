/**
 * Office 365 Email Sender — Microsoft Graph API
 *
 * Sends emails through the organization's M365 tenant.
 * Requires Azure AD app with Mail.Send permission.
 */

import { graphPost } from "./graph";

const DEFAULT_SENDER = process.env.O365_SENDER_USER_ID || "portal@mysccg.de";

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
  senderUserId?: string; // Override sender mailbox
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
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

  const bccRecipients = (params.bcc || []).map((c) => ({
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
      ...(bccRecipients.length > 0 && { bccRecipients }),
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
          <p style="text-align: center; margin-top: 24px;">
             <a href="${data.loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Login to SCCG Portal</a>
          </p>
          <p style="color: #ef4444; font-size: 14px; text-align: center;">⚠️ Please change your password after first login.</p>
          <p style="font-size: 14px;">If you have any questions, please contact <a href="mailto:info@mysccg.de" style="color: #2563eb;">info@mysccg.de</a>.</p>
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
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #166534;">🔐 Your Login Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Username (Email)</td><td style="padding: 6px 0; font-weight: bold;">${data.email}</td></tr>
        </table>
        <p style="margin: 12px 0 0; color: #166534; font-size: 13px;">✓ You already have an account. Please log in with your existing password. If you have forgotten it, use the “Forgot password” link on the login page.</p>
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
            <p style="font-size: 13px; color: #64748b; margin-top: 10px;">Portal Link: <a href="${data.loginUrl}" style="color: #2563eb; font-weight: 500;">${data.loginUrl}</a></p>
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

/**
 * Certificate of Cooperation email sent to a B2B partner with the PDF attached.
 */
export function buildB2BCertificateEmail(data: {
  partnerName: string;
  subPartnerName: string;
  certCode: string;
  verifyUrl: string;
}): { subject: string; htmlBody: string } {
  return {
    subject: `Certificate of Cooperation — ${data.partnerName} & ${data.subPartnerName}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Certificate of Cooperation</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Career Lab Germany</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.subPartnerName}</strong> Team,</p>
          <p>We are pleased to share the official <strong>Certificate of Cooperation</strong> confirming the partnership between <strong>${data.partnerName}</strong> (Regional Partner of SCCG Career Lab Germany) and <strong>${data.subPartnerName}</strong>.</p>
          <p>The certificate is attached to this email as a PDF document.</p>
          <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 150px;">Certificate Code</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">${data.certCode}</td></tr>
            </table>
            <p style="margin: 12px 0 0; font-size: 13px;">Verify online: <a href="${data.verifyUrl}" style="color: #2563eb;">${data.verifyUrl}</a></p>
          </div>
          <p>This cooperation reflects our joint commitment to supporting candidate identification, preparation, and participation in international career development programs. This partnership is non-commercial in nature.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
            Best regards,<br/>
            <strong>${data.partnerName}</strong><br/>
            SCCG Career Lab Germany<br/>
            Website: <a href="https://www.mysccg.de/" style="color: #2563eb;">www.mysccg.de</a>
          </p>
        </div>
      </div>
    `,
  };
}

/**
 * Confirmation email sent to a candidate when a partner adds new service(s)
 * to their existing registration.
 */
export function buildServiceAddedEmail(data: {
  candidateName: string;
  sccgId: string;
  partnerName: string;
  services: { serviceName: string; quantity: number; totalPrice: number }[];
  addedAmount: number;
  newTotal: number;
  loginUrl: string;
}): { subject: string; htmlBody: string } {
  const rows = data.services
    .map(
      (s) =>
        `<tr><td style="padding: 8px 0; color: #334155;">${s.serviceName}${s.quantity > 1 ? ` × ${s.quantity}` : ""}</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">€${s.totalPrice.toFixed(2)}</td></tr>`,
    )
    .join("");
  return {
    subject: `New Service Added to Your SCCG Registration — ${data.sccgId}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Service Added</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Career Lab Germany</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear <strong>${data.candidateName}</strong>,</p>
          <p><strong>${data.partnerName}</strong> has added the following service(s) to your registration (<strong>${data.sccgId}</strong>):</p>
          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            ${rows}
            <tr><td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0; color: #64748b;">Added Amount</td><td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0; text-align: right; font-weight: bold;">€${data.addedAmount.toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">New Total Service Fee</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">€${data.newTotal.toFixed(2)}</td></tr>
          </table>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View in Your Portal</a>
          </div>
          <p>Log in to your portal to review the updated details, payment information, and your application timeline.</p>
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

export function buildPartnerOfferEmail(data: {
  candidateName: string;
  candidateEmail: string;
  offerNumber: string;
  partnerName: string;
  partnerLogoUrl?: string;
  services: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    description?: string;
    sessions?: number;
    category?: string;
    includes?: string[];
  }>;
  totalAmount: number;
  currency: string;
  rate: number;
  validUntil: string;
  notes?: string;
  loginUrl: string;
  loginPassword?: string;
  isNewUser?: boolean;
  acceptUrl?: string;
  rejectUrl?: string;
  serviceCategory?: string;
}): { subject: string; htmlBody: string } {
  const logoHtml = data.partnerLogoUrl
    ? `<img src="${data.partnerLogoUrl}" alt="${data.partnerName} logo" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:12px;display:block;" />`
    : "";

  const serviceRows = data.services
    .map(
      (s) => `
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <div style="font-weight:600;color:#0f172a;font-size:14px;">${s.name}</div>
          ${s.category ? `<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;">${s.category}</div>` : ""}
          ${s.description ? `<div style="font-size:13px;color:#475569;margin-top:6px;line-height:1.5;">${s.description}</div>` : ""}
          ${
            s.includes && s.includes.length > 0
              ? `<ul style="margin:8px 0 0 0;padding:0;list-style:none;">${s.includes.map((f) => `<li style="font-size:12px;color:#2563eb;margin-top:3px;">✓ ${f}</li>`).join("")}</ul>`
              : s.sessions
              ? `<div style="font-size:12px;color:#2563eb;margin-top:4px;">✓ Includes ${s.sessions} expert session${s.sessions !== 1 ? "s" : ""}</div>`
              : ""
          }
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;vertical-align:top;font-size:14px;">${s.quantity}</td>
      </tr>`
    )
    .join("");

  const credentialsHtml = data.loginPassword
    ? `
    <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:12px;padding:24px;margin:28px 0;">
      <div style="font-size:15px;font-weight:700;color:#92400e;margin-bottom:14px;">🔐 Your Portal Login Credentials</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;width:160px;font-size:13px;">Email</td><td style="padding:6px 0;font-weight:600;font-size:13px;">${data.candidateEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Password</td><td style="padding:6px 0;"><span style="font-family:monospace;background:#fff;border:1px solid #fbbf24;padding:5px 12px;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:1px;">${data.loginPassword}</span></td></tr>
      </table>
      <p style="color:#dc2626;font-size:12px;margin:12px 0 0;">⚠️ Please change your password after your first login.</p>
    </div>`
    : `
    <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:12px;padding:16px;margin:28px 0;">
      <p style="margin:0;color:#166534;font-size:14px;">✓ Log in with your existing SCCG Portal credentials to view and accept this offer.</p>
    </div>`;

  const category = data.serviceCategory || "Germany Career Services";

  const acceptRejectHtml = data.acceptUrl && data.rejectUrl
    ? `
    <div style="text-align:center;margin:28px 0;">
      <a href="${data.acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:0 8px 12px;">
        ✓ Accept Offer
      </a>
      <a href="${data.rejectUrl}" style="display:inline-block;background:#f1f5f9;color:#64748b;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:0 8px 12px;border:1px solid #e2e8f0;">
        ✗ Decline
      </a>
    </div>`
    : `
    <div style="text-align:center;margin:28px 0;">
      <a href="${data.loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.3px;">
        View &amp; Accept Offer →
      </a>
    </div>`;

  return {
    subject: `New Service Offer from SCCG Germany — ${category} (Ref: ${data.offerNumber})`,
    htmlBody: `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px;">

  <!-- Header card -->
  <div style="background:linear-gradient(135deg,#0a1628,#1a2a4a);border-radius:14px 14px 0 0;padding:28px 32px;">
    ${logoHtml}
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">New Service Offer — SCCG Career Lab Germany</h1>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Ref: <strong style="color:#e2e8f0;">${data.offerNumber}</strong> &nbsp;·&nbsp; Valid until ${new Date(data.validUntil).toLocaleDateString("en-GB")}</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;">
    <p style="font-size:15px;color:#0f172a;">Dear <strong>${data.candidateName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      You have received a new offer from <strong>SCCG Career Lab Germany</strong> for 
      <strong>${category}</strong> through our partner <strong>${data.partnerName}</strong>.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Please review the services included below and click <strong>Accept Offer</strong> to confirm — or <strong>Decline</strong> if you'd like to discuss further.
    </p>

    <!-- Services table (no price columns) -->
    <table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Service / Package</th>
          <th style="padding:12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;width:60px;">Qty</th>
        </tr>
      </thead>
      <tbody>${serviceRows}</tbody>
    </table>

    ${data.notes ? `<div style="background:#f8fafc;border-left:3px solid #cbd5e1;padding:12px 16px;border-radius:6px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#475569;"><strong>Notes:</strong> ${data.notes}</p></div>` : ""}

    <!-- Credentials -->
    ${credentialsHtml}

    <!-- Accept/Reject CTA -->
    ${acceptRejectHtml}

    <p style="font-size:13px;color:#64748b;line-height:1.6;">
      After accepting you can:<br/>
      ✓ Track your application and service timeline<br/>
      ✓ Upload required documents<br/>
      ✓ Communicate with your consultant<br/>
      ✓ View payment schedule
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;"/>
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      This offer was sent via <strong>SCCG Partner Portal</strong>. 
      Questions? Contact us at <a href="mailto:info@mysccg.de" style="color:#2563eb;">info@mysccg.de</a> 
      or visit <a href="https://www.mysccg.de/" style="color:#2563eb;">www.mysccg.de</a>.
    </p>
  </div>
</div>`,
  };
}

export function injectTemplateVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    // Replace all occurrences of [Key] with the value
    // E.g. [CandidateName] -> John Doe
    const regex = new RegExp(`\\[${key}\\]`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

export async function buildSessionEmailTemplateAsync(data: {
  recipientName: string;
  role: "candidate" | "expert";
  sessionNumber: number;
  scheduledAt?: string;
  sessionTitle: string;
  sessionDetails: string;
  meetingUrl?: string;
  notes?: string;
  expertName?: string;
  candidateName?: string;
  candidateType: string;
}): Promise<{ subject: string; htmlBody: string }> {
  let template: import("@/types").EmailTemplate | null = null;
  try {
    const { Repository } = await import("@/lib/repository");
    const normalizedType = data.candidateType.toLowerCase().replace(/[^a-z0-9]/g, "-");
    let templateKey = `session-${data.role}-${normalizedType}-${data.sessionNumber}`;
    template = await Repository.emailTemplates.getByTemplateKey(templateKey);
    if (!template) {
      template = await Repository.emailTemplates.getByTemplateKey(`session-${data.role}-default`);
    }
  } catch {
    template = null;
  }

  const when = data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("en-GB") : "TBD";
  
  const variables = {
    RecipientName: data.recipientName,
    CandidateName: data.candidateName || "",
    ExpertName: data.expertName || "",
    SessionNumber: String(data.sessionNumber),
    ScheduledAt: when,
    SessionTitle: data.sessionTitle,
    SessionDetails: data.sessionDetails,
    MeetingUrl: data.meetingUrl || "TBD",
    AdditionalNotes: data.notes || "None",
  };

  if (template && template.subjectTemplate?.trim() && template.htmlBodyTemplate?.trim()) {
    const subj = injectTemplateVariables(template.subjectTemplate, variables).trim();
    const body = injectTemplateVariables(template.htmlBodyTemplate, variables).trim();
    if (subj && body) {
      return { subject: subj, htmlBody: body };
    }
  }

  // ROBUST, FULLY-STYLED EMAIL TEMPLATE (used whenever custom template is absent or blank)
  const sessionHeading = data.sessionTitle || `Session ${data.sessionNumber} Consultation`;
  const subjectRole = data.role === "expert"
    ? `SCCG Expert Assignment — Session #${data.sessionNumber}: ${sessionHeading} (${data.candidateName || "Candidate"})`
    : `SCCG Career Lab Germany — Session #${data.sessionNumber}: ${sessionHeading} Scheduled`;

  const intro = data.role === "expert"
    ? `<p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">You have been assigned to conduct <strong>Session #${data.sessionNumber}</strong> for candidate <strong>${data.candidateName || "Candidate"}</strong> (${data.candidateType}).</p>`
    : `<p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">Your <strong>Session #${data.sessionNumber}</strong> (${data.candidateType}) has been scheduled with expert advisor <strong>${data.expertName || "SCCG Expert Advisor"}</strong>.</p>`;

  const notesHtml = data.notes
    ? `<div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="margin: 0 0 4px; font-size: 12px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">Advisor Notes / Instructions</p>
        <p style="margin: 0; font-size: 14px; color: #334155;">${data.notes}</p>
      </div>`
    : "";

  const detailsHtml = data.sessionDetails
    ? `<div style="background: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin: 16px 0;">
        <h4 style="margin: 0 0 8px; color: #0f172a; font-size: 14px;">📋 Session Agenda & Topics</h4>
        <div style="color: #334155; font-size: 14px; line-height: 1.6;">${data.sessionDetails}</div>
      </div>`
    : "";

  const meetingUrl = data.meetingUrl || "https://portal.mysccg.de/customer/sessions";
  const meetingHtml = `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
      <h4 style="margin: 0 0 8px; color: #1e40af; font-size: 15px;">🌐 Online Meeting Link</h4>
      <div style="margin: 12px 0;">
        <a href="${meetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Join Online Meeting</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 8px 0 0; word-break: break-all;">Direct Link: <a href="${meetingUrl}" style="color: #2563eb;">${meetingUrl}</a></p>
    </div>
  `;

  return {
    subject: subjectRole,
    htmlBody: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 28px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff;">SCCG Career Lab Germany</h1>
        <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Session #${data.sessionNumber} — ${sessionHeading}</p>
      </div>
      <div style="padding: 28px 32px;">
        <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.recipientName}</strong>,</p>
        ${intro}
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; width: 140px;">Program Track</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${data.candidateType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Session</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Session #${data.sessionNumber}: ${sessionHeading}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Date & Time</td>
            <td style="padding: 8px 0; font-weight: 600; color: #2563eb;">${when}</td>
          </tr>
          ${data.role === "candidate" && data.expertName ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Assigned Expert</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${data.expertName}</td>
          </tr>` : ""}
          ${data.role === "expert" && data.candidateName ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Candidate Name</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${data.candidateName}</td>
          </tr>` : ""}
        </table>

        ${meetingHtml}
        ${detailsHtml}
        ${notesHtml}

        ${data.role === "expert" ? `<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #166534; margin-top: 14px;">📎 Candidate CV and documents are attached to this email.</div>` : ""}

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 13px; color: #64748b;">
          <p style="margin: 0 0 4px;">For assistance, visit your <a href="https://portal.mysccg.de/login" style="color: #2563eb; font-weight: 600;">SCCG Portal</a> or contact <a href="mailto:info@mysccg.de" style="color: #2563eb;">info@mysccg.de</a>.</p>
          <p style="margin: 8px 0 0; color: #94a3b8;">SCCG Career Lab Germany · www.mysccg.de</p>
        </div>
      </div>
    </div>
    `
  };
}
