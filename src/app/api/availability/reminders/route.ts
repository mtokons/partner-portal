import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { sendEmailViaGraph } from "@/lib/email";
import { AVAILABILITY_CONFIG } from "@/lib/availability-config";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "Forbidden: Only managers can send reminders." }, { status: 403 });
    }

    const body = await request.json();
    const { targetDate, recipients } = body; // recipients: Array<{ email: string, name: string }>

    if (!targetDate || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "targetDate and at least one recipient are required." },
        { status: 400 }
      );
    }

    const subject = `[Reminder] Team Availability Entry Required for ${targetDate}`;
    let sentCount = 0;

    for (const rec of recipients) {
      if (!rec.email) continue;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0f172a;">Reminder: Submit Your Availability</h2>
          <p>Hi ${rec.name || "Colleague"},</p>
          <p>
            You have not yet submitted your availability for <strong>${targetDate}</strong>.
            Please submit your entry before the cut-off time (${AVAILABILITY_CONFIG.cutOffTime} Asia/Dhaka) so the team schedule remains up to date.
          </p>
          <div style="margin: 25px 0;">
            <a href="https://portal.mysccg.de/sccg/availability"
               style="background-color: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Submit My Availability
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            SCCG Career Lab — Office Management System
          </p>
        </div>
      `;

      try {
        await sendEmailViaGraph({
          to: rec.email,
          toName: rec.name,
          subject,
          htmlBody,
        });
        sentCount++;
      } catch (err: any) {
        console.warn(`[SendReminder] Failed to send email to ${rec.email}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent reminders to ${sentCount} colleague(s).`,
      sentCount,
    });
  } catch (err: any) {
    console.error("[POST /api/availability/reminders] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to send reminders" }, { status: 500 });
  }
}
