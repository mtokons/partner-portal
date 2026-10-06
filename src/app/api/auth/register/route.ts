import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import type { FirebaseUserProfile, FirebaseUserRole } from "@/lib/firebase-auth";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role, company, specialization } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "User Error: Full name is required.", errorCategory: "user" },
        { status: 400 }
      );
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Validation Error: A valid email address is required.", errorCategory: "validation" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password Error: Password must be at least 6 characters.", errorCategory: "password" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminApp = getAdminApp();

    if (!adminApp) {
      return NextResponse.json(
        {
          success: false,
          error: "Server Error: Firebase Admin service is temporarily unavailable. Please contact the administrator.",
          errorCategory: "server",
        },
        { status: 500 }
      );
    }

    const adminAuth = adminApp.auth();

    // 2. Check for duplicate email
    try {
      const existingUser = await adminAuth.getUserByEmail(cleanEmail);
      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate Email Error: An account with this email address already exists. Please sign in instead.",
            errorCategory: "duplicate_email",
          },
          { status: 409 }
        );
      }
    } catch (lookupErr: any) {
      if (lookupErr.code !== "auth/user-not-found") {
        console.warn("[RegisterAPI] User lookup warning:", lookupErr.message);
      }
    }

    // 3. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: password,
        displayName: name.trim(),
        phoneNumber: phone && /^\+[1-9]\d{1,14}$/.test(phone.trim()) ? phone.trim() : undefined,
      });
    } catch (createErr: any) {
      const code = createErr?.code || "";
      const msg = createErr?.message || "";

      if (code === "auth/email-already-exists" || code === "auth/email-already-in-use" || msg.includes("already exists")) {
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate Email Error: An account with this email address already exists. Please sign in instead.",
            errorCategory: "duplicate_email",
          },
          { status: 409 }
        );
      }

      if (code === "auth/invalid-password" || msg.includes("password")) {
        return NextResponse.json(
          {
            success: false,
            error: "Password Error: Password is too weak or invalid. Please use at least 6 characters.",
            errorCategory: "password",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `API Error: Could not create authentication record (${msg || code}).`,
          errorCategory: "api",
        },
        { status: 400 }
      );
    }

    // 4. Create Firestore profile
    try {
      const db = getAdminFirestore();
      const userRole: FirebaseUserRole = (role || "partner").toLowerCase();
      const profileData: FirebaseUserProfile = {
        uid: userRecord.uid,
        email: cleanEmail,
        displayName: name.trim(),
        phone: phone ? phone.trim() : "",
        role: userRole,
        company: company ? company.trim() : "",
        specialization: specialization ? specialization.trim() : "",
        photoURL: "",
        emailVerified: false,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(userRecord.uid).set(profileData);

      // Log activity
      await db.collection("activityLogs").add({
        uid: userRecord.uid,
        action: "account_created",
        details: `Registered as ${userRole} via server API`,
        timestamp: FieldValue.serverTimestamp(),
      }).catch(() => {});
    } catch (fsErr: any) {
      console.error("[RegisterAPI] Firestore profile creation error:", fsErr.message);
      // Non-fatal if profile write failed, user is created in auth
    }

    // 5. Send welcome email notification to the user & notify admin
    try {
      const { sendEmailViaGraph, buildNewUserRegistrationWelcomeEmail } = await import("@/lib/email");
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://portal.mysccg.de";
      const emailContent = buildNewUserRegistrationWelcomeEmail({
        userName: name.trim(),
        userEmail: cleanEmail,
        role: (role || "partner").toLowerCase(),
        company: company ? String(company).trim() : undefined,
        loginUrl: `${appUrl.replace(/\/$/, "")}/login`,
      });

      await sendEmailViaGraph({
        to: cleanEmail,
        toName: name.trim(),
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        bcc: [{ email: "info@mysccg.de", name: "SCCG Administration" }],
      });
      console.log(`[RegisterAPI] Welcome email notification dispatched to ${cleanEmail}`);
    } catch (emailErr: any) {
      console.error("[RegisterAPI] Failed to dispatch welcome email:", emailErr?.message || emailErr);
    }

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: "Account created successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/auth/register] Unhandled error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Server Error: An unexpected error occurred while processing registration.",
        errorCategory: "server",
      },
      { status: 500 }
    );
  }
}
