import { NextResponse } from "next/server";
import {
  getDhakaToday,
  isDateWeekend,
  calculateDailyReport,
} from "@/lib/availability";
import {
  getAvailabilityForRange,
  recordAuditLog,
  getHiddenAvailabilityMemberIds,
} from "@/lib/availability-server";
import { getAllManagedUsers } from "@/lib/admin-users";
import { generateDailyReportPdf } from "@/lib/availability-pdf";
import { sendEmailViaGraph } from "@/lib/email";
import { AVAILABILITY_CONFIG, STATUS_LABELS } from "@/lib/availability-config";

import { resolveCategory } from "@/lib/role-options";

export const dynamic = "force-dynamic";

/**
 * Scheduled job endpoint running at 8:30 AM (Asia/Dhaka) on working days (Sun-Thu).
 * Triggered by cron runner or management.
 */
export async function GET(request: Request) {
  return handleMorningReport(request);
}

export async function POST(request: Request) {
  return handleMorningReport(request);
}

async function handleMorningReport(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const dateParam = searchParams.get("date");
    const todayStr = dateParam || getDhakaToday();

    // Verify secret if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !force) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    // Check if today is a weekend (e.g. Friday or Saturday)
    if (!force && isDateWeekend(todayStr)) {
      return NextResponse.json({
        message: `Skipping automated report: ${todayStr} is a non-working weekend in Asia/Dhaka.`,
        skipped: true,
      });
    }

    // Idempotency check: check if report was already sent for this date
    const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");
    const auditListUrl = await getSiteListUrlAsync("AvailabilityAudit");
    const idempotencyKey = `cron_morning_report_${todayStr}`;
    const filter = `fields/Title eq '${idempotencyKey}'`;
    const checkRes = await graphGet<{ value?: any[] }>(
      `${auditListUrl}?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=1`
    ).catch(() => ({ value: [] }));

    if (!force && checkRes?.value && checkRes.value.length > 0) {
      return NextResponse.json({
        message: `Report for ${todayStr} was already dispatched. Use ?force=true to resend.`,
        skipped: true,
        dispatchedAt: checkRes.value[0].fields?.ChangedAt,
      });
    }

    // Fetch managed colleagues & records for today (strictly filtered to SCCG team members, excluding hidden members)
    const [allUsers, records, hiddenIds] = await Promise.all([
      getAllManagedUsers().catch(() => []),
      getAvailabilityForRange(todayStr, todayStr),
      getHiddenAvailabilityMemberIds().catch(() => [] as string[]),
    ]);

    const isSccgMember = (u: any) => {
      if (u.status === "suspended") return false;
      if (hiddenIds.includes(u.id)) return false;
      const cat = resolveCategory(u.category, u.primaryRole);
      if (cat === "sccg-admin" || cat === "sccg-staff") return true;
      const role = String(u.primaryRole || u.role || "").toLowerCase().trim();
      const sccgRoles = ["admin", "sccg-admin", "sccg-staff", "finance", "hr", "school-manager", "project-admin", "teacher"];
      if (sccgRoles.includes(role)) return true;
      const company = String(u.company || "").toLowerCase();
      if (company.includes("sccg")) return true;
      const email = String(u.email || "").toLowerCase();
      if (email.endsWith("@mysccg.de")) {
        const partnerKeywords = ["partner", "gfa", "educraft", "gopa", "integration", "icon"];
        if (!partnerKeywords.some((pk) => email.includes(pk))) return true;
      }
      return false;
    };

    const activeColleagues = allUsers
      .filter(isSccgMember)
      .map((u) => {
        const cat = resolveCategory(u.category, u.primaryRole);
        return {
          id: u.id,
          email: u.email,
          displayName: u.displayName || u.email.split("@")[0],
          department: cat === "sccg-admin" ? "SCCG Admin" : (u.company || "SCCG Staff"),
          roles: u.roles || [],
          category: cat === "sccg-admin" ? "sccg-admin" : "sccg-staff",
        };
      });

    const report = calculateDailyReport(todayStr, activeColleagues, records);

    // Generate PDF attachment
    const pdfBytes = generateDailyReportPdf(report);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // Compose HTML email body
    const notFullyRows = report.notFullyAvailableList.map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">
          ${item.userName}
          <div style="font-size: 12px; color: #64748b; font-weight: normal;">${item.department} ${item.note ? `• ${item.note}` : ""}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e;">
            ${item.timeRange || STATUS_LABELS[item.status] || item.status}
          </span>
        </td>
      </tr>
    `).join("");

    const notSubRows = report.notSubmittedList.map((item) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">
          ${item.userName}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">
          ${item.department}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #94a3b8; font-style: italic; font-size: 12px;">
          No entry
        </td>
      </tr>
    `).join("");

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Daily availability report</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">${todayStr}, sent 8:30 AM to management (Asia/Dhaka)</p>
        </div>

        <div style="background-color: #f8fafc; padding: 16px 20px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <div style="flex: 1; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b;">Available</div>
              <div style="font-size: 22px; font-weight: bold; color: #16a34a;">${report.availableCount}</div>
            </div>
            <div style="flex: 1; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b;">Partial</div>
              <div style="font-size: 22px; font-weight: bold; color: #d97706;">${report.partialCount}</div>
            </div>
            <div style="flex: 1; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b;">On leave</div>
              <div style="font-size: 22px; font-weight: bold; color: #e11d48;">${report.leaveCount}</div>
            </div>
            <div style="flex: 1; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b;">Remote / Field</div>
              <div style="font-size: 22px; font-weight: bold; color: #2563eb;">${report.remoteFieldCount}</div>
            </div>
            <div style="flex: 1; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="font-size: 12px; color: #64748b;">Not submitted</div>
              <div style="font-size: 22px; font-weight: bold; color: #64748b;">${report.notSubmittedCount}</div>
            </div>
          </div>

          <h3 style="font-size: 15px; margin: 20px 0 10px 0; color: #0f172a;">Not fully available today (${report.notFullyAvailableList.length})</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tbody>
              ${notFullyRows || '<tr><td colspan="2" style="padding: 12px; color: #94a3b8; font-style: italic;">All colleagues are fully available today.</td></tr>'}
            </tbody>
          </table>

          <h3 style="font-size: 15px; margin: 24px 0 10px 0; color: #0f172a;">Not submitted yet (${report.notSubmittedList.length})</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tbody>
              ${notSubRows || '<tr><td colspan="3" style="padding: 12px; color: #94a3b8; font-style: italic;">All staff have submitted for today.</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="https://portal.mysccg.de/admin/availability"
               style="background-color: #2563eb; color: #fff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Team Calendar & Report
            </a>
          </div>
        </div>

        <div style="padding: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          SCCG Career Lab UG • Automated Team Availability Report
        </div>
      </div>
    `;

    const subject = `[Daily Availability Report] ${todayStr} — SCCG Team Availability`;
    const recipients = AVAILABILITY_CONFIG.managementEmails;

    for (const email of recipients) {
      await sendEmailViaGraph({
        to: email,
        subject,
        htmlBody,
        attachments: [
          {
            name: `daily-availability-${todayStr}.pdf`,
            contentType: "application/pdf",
            contentBase64: pdfBase64,
          },
        ],
      }).catch((err) => console.warn(`Failed to email daily report to ${email}:`, err.message));
    }

    // Automatically notify any colleague who missed submitting availability for today
    if (report.notSubmittedList.length > 0) {
      for (const item of report.notSubmittedList) {
        if (!item.userEmail) continue;
        const missingHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #991b1b; padding: 16px 20px; color: #ffffff;">
              <h3 style="margin: 0; font-size: 16px;">⚠️ Action Required: Submit Today's Availability</h3>
            </div>
            <div style="padding: 20px; background-color: #ffffff;">
              <p>Hi ${item.userName},</p>
              <p>You have not yet submitted your team availability for today (<strong>${todayStr}</strong>).</p>
              <p>Please log in and update your schedule immediately:</p>
              <div style="margin: 20px 0;">
                <a href="https://portal.mysccg.de/sccg/availability"
                   style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Submit Availability Now
                </a>
              </div>
            </div>
          </div>
        `;
        sendEmailViaGraph({
          to: item.userEmail,
          toName: item.userName,
          subject: `[Reminder] Missing Team Availability Entry for Today (${todayStr})`,
          htmlBody: missingHtml,
        }).catch((e) => console.warn(`Failed to notify missing colleague ${item.userEmail}:`, e.message));
      }
    }

    // Record audit log for idempotency and tracking
    await recordAuditLog({
      userId: "system_cron",
      date: todayStr,
      action: "create",
      changedBy: "system@mysccg.de",
      changedAt: new Date().toISOString(),
      newValue: JSON.stringify({
        date: todayStr,
        available: report.availableCount,
        partial: report.partialCount,
        leave: report.leaveCount,
        remoteField: report.remoteFieldCount,
        notSubmitted: report.notSubmittedCount,
      }),
      reason: `Automated morning report dispatched to ${recipients.join(", ")}`,
    });

    return NextResponse.json({
      success: true,
      message: `Morning report for ${todayStr} dispatched to ${recipients.length} recipients.`,
      report,
    });
  } catch (err: any) {
    console.error("[availability-report cron] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to run morning report" }, { status: 500 });
  }
}
