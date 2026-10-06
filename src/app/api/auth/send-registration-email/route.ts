import { NextResponse } from "next/server";
import { sendEmailViaGraph, buildNewUserRegistrationWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role, company } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://portal.mysccg.de";
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split("@")[0]).trim();
    const cleanRole = role || "partner";

    const emailContent = buildNewUserRegistrationWelcomeEmail({
      userName: cleanName,
      userEmail: cleanEmail,
      role: cleanRole,
      company: company ? String(company).trim() : undefined,
      loginUrl: `${appUrl.replace(/\/$/, "")}/login`,
    });

    await sendEmailViaGraph({
      to: cleanEmail,
      toName: cleanName,
      subject: emailContent.subject,
      htmlBody: emailContent.htmlBody,
      bcc: [{ email: "info@mysccg.de", name: "SCCG Administration" }],
    });

    return NextResponse.json({
      success: true,
      message: `Welcome email dispatched to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/send-registration-email] Error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to dispatch email" },
      { status: 500 }
    );
  }
}
