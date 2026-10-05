import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { sendEmailViaGraph } from "@/lib/email";
import { AVAILABILITY_CONFIG } from "@/lib/availability-config";
import { getAllManagedUsers } from "@/lib/admin-users";
import { getAvailabilityForRange, getHiddenAvailabilityMemberIds } from "@/lib/availability-server";
import { resolveCategory } from "@/lib/role-options";

export const dynamic = "force-dynamic";

/**
 * Send a direct one-on-one Microsoft Teams chat message via Graph API
 */
async function sendTeamsChatNotification(recipientEmail: string, subject: string, messageHtml: string): Promise<boolean> {
  try {
    const { getGraphClient } = await import("@/lib/graph");
    const client = await getGraphClient();

    const senderEmail = process.env.O365_SENDER_USER_ID || process.env.MS_GRAPH_USER_ID || "portal@mysccg.de";
    const senderRes = await client.api(`/users/${senderEmail}`).select("id").get().catch(() => null);
    const senderId = senderRes?.id || senderEmail;

    const userRes = await client.api(`/users/${recipientEmail}`).select("id,displayName").get().catch(() => null);
    if (!userRes?.id) return false;

    const chatBody = {
      chatType: "oneOnOne",
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${senderId}`,
        },
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userRes.id}`,
        },
      ],
    };

    const chat = await client.api("/chats").post(chatBody).catch(() => null);
    if (!chat?.id) return false;

    await client.api(`/chats/${chat.id}/messages`).post({
      body: {
        contentType: "html",
        content: `<b>${subject}</b><br/>${messageHtml}`,
      },
    }).catch(() => null);

    return true;
  } catch (err: any) {
    console.warn(`[TeamsReminder] Chat skipped for ${recipientEmail}:`, err?.message || err);
    return false;
  }
}

/**
 * Optional Teams incoming webhook announcement
 */
async function sendTeamsWebhookNotification(targetDate: string, colleagues: Array<{ name: string; email: string }>) {
  const webhookUrl = process.env.TEAMS_AVAILABILITY_WEBHOOK_URL || process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl || colleagues.length === 0) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "2563EB",
        "summary": `Availability Reminder for ${targetDate}`,
        "title": `🔔 Team Availability Reminder — ${targetDate}`,
        "text": `Reminder to submit your availability before cut-off (${AVAILABILITY_CONFIG.cutOffTime} Asia/Dhaka):<br/>` +
          colleagues.map((c) => `• <strong>${c.name}</strong> (${c.email})`).join("<br/>") +
          `<br/><br/>👉 <a href="https://portal.mysccg.de/sccg/availability">Open Team Availability Console</a>`,
      }),
    });
  } catch (err: any) {
    console.warn("[TeamsWebhook] Post failed:", err.message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = (user.roles || [user.role]).map((r) => r.toLowerCase().trim());
    const isManager = userRoles.some((r) =>
      AVAILABILITY_CONFIG.managerRoles.map((m) => m.toLowerCase()).includes(r)
    );

    if (!isManager) {
      return NextResponse.json({ error: "Forbidden: Only administrators and managers can dispatch reminders." }, { status: 403 });
    }

    const body = await request.json();
    const { targetDate } = body;
    let recipients: Array<{ email: string; name: string }> = Array.isArray(body.recipients) ? body.recipients : [];

    if (!targetDate) {
      return NextResponse.json({ error: "targetDate is required (YYYY-MM-DD)." }, { status: 400 });
    }

    // If recipients list is empty, automatically detect all colleagues missing availability for targetDate
    if (recipients.length === 0) {
      const [managedUsers, records, hiddenIds] = await Promise.all([
        getAllManagedUsers().catch(() => []),
        getAvailabilityForRange(targetDate, targetDate),
        getHiddenAvailabilityMemberIds().catch(() => [] as string[]),
      ]);

      const activeColleagues = managedUsers
        .filter((u) => {
          if (u.status === "suspended") return false;
          if (hiddenIds.includes(u.id)) return false; // respect global hidden setting
          const cat = resolveCategory(u.category, u.primaryRole);
          return cat === "sccg-admin" || cat === "sccg-staff";
        })
        .map((u) => ({
          id: u.id,
          email: u.email,
          name: u.displayName || u.email.split("@")[0],
        }));

      const submittedUserIds = new Set(records.map((r) => r.userId));
      const submittedEmails = new Set(records.map((r) => (r.userEmail || "").toLowerCase()));

      recipients = activeColleagues
        .filter((c) => !submittedUserIds.has(c.id) && !submittedEmails.has(c.email.toLowerCase()))
        .map((c) => ({ email: c.email, name: c.name }));
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All team members have already submitted their availability for ${targetDate}. No reminders required!`,
        sentCountEmail: 0,
        sentCountTeams: 0,
        recipients: [],
      });
    }

    const subject = `[Reminder] Team Availability Entry Required for ${targetDate}`;
    let sentCountEmail = 0;
    let sentCountTeams = 0;

    for (const rec of recipients) {
      if (!rec.email) continue;

      // 1. Send Email Notification
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px;">⚠️ Reminder: Submit Your Availability</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">SCCG Career Lab — Office Management System</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Dear ${rec.name || "Colleague"},</p>
            <p>
              Our records show that you have not yet submitted your availability for <strong>${targetDate}</strong>.
            </p>
            <p>
              Please submit your planned schedule (Indoor / Partial / Remote / Leave) before the cut-off time (<strong>${AVAILABILITY_CONFIG.cutOffTime} Asia/Dhaka</strong>) so that team scheduling and morning rosters remain accurate.
            </p>
            <div style="margin: 28px 0; text-align: center;">
              <a href="https://portal.mysccg.de/sccg/availability"
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
                Submit My Availability Now →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              If you have already submitted or have discussed this with your team lead, please disregard this notice.
            </p>
          </div>
        </div>
      `;

      try {
        await sendEmailViaGraph({
          to: rec.email,
          toName: rec.name,
          subject,
          htmlBody,
        });
        sentCountEmail++;
      } catch (err: any) {
        console.warn(`[SendReminder] Email failed for ${rec.email}:`, err.message);
      }

      // 2. Send Microsoft Teams Direct Chat Notification
      const teamsMsgHtml = `
        Hi ${rec.name || "Colleague"}, you have not submitted your team availability for <b>${targetDate}</b>.<br/>
        Please update your schedule before cut-off (${AVAILABILITY_CONFIG.cutOffTime} Asia/Dhaka):<br/>
        <a href="https://portal.mysccg.de/sccg/availability">Submit Availability on Portal</a>
      `;

      try {
        const teamsOk = await sendTeamsChatNotification(rec.email, subject, teamsMsgHtml);
        if (teamsOk) sentCountTeams++;
      } catch (tErr: any) {
        console.warn(`[SendReminder] Teams chat failed for ${rec.email}:`, tErr.message);
      }
    }

    // 3. Post to Teams channel webhook if configured
    await sendTeamsWebhookNotification(targetDate, recipients);

    return NextResponse.json({
      success: true,
      message: `Dispatched reminders to ${recipients.length} colleague(s) (${sentCountEmail} emails, ${sentCountTeams} Teams chats).`,
      sentCountEmail,
      sentCountTeams,
      recipients,
    });
  } catch (err: any) {
    console.error("[POST /api/availability/reminders] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch reminders" }, { status: 500 });
  }
}
