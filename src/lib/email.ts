/**
 * Office 365 Email Sender — Microsoft Graph API
 *
 * Sends emails through the organization's M365 tenant.
 * Requires Azure AD app with Mail.Send permission.
 */

import { graphPost } from "./graph";

const DEFAULT_SENDER = process.env.O365_SENDER_USER_ID || "portal@sccg.com";

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
    subject: "Welcome to SCCG Portal — Your Account is Ready",
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
    subject: `Welcome to SCCG — ${data.designation}`,
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
    subject: `Enrollment Confirmed — ${data.courseName} (${data.batchCode})`,
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
    subject: `Your SCCG Certificate — ${data.courseName}`,
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
    subject: `Exam Results Published — ${data.courseName}`,
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
