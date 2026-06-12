/**
 * Candidate User Account Management
 *
 * Handles auto-creation of user accounts when partners register candidates.
 * Ensures deduplication by email and sends login credentials via email.
 */

import crypto from "crypto";
import { hash } from "bcryptjs";

/**
 * Generate a secure temporary password (12 chars, mixed case + digits + special).
 */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  // Ensure at least one of each category
  const bytes = crypto.randomBytes(12);
  const parts = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];

  // Fill remaining 8 chars
  for (let i = 4; i < 12; i++) {
    parts.push(all[bytes[i] % all.length]);
  }

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join("");
}

/**
 * Find or create a customer account for a candidate.
 * Returns the existing user if email already exists (deduplication).
 * Creates Firebase Auth user + Firestore profile + SharePoint Customer if new.
 */
export async function ensureCandidateUserAccount(data: {
  email: string;
  fullName: string;
  phone?: string;
  partnerId: string;
  partnerName: string;
  sccgId: string;
}): Promise<{
  isNew: boolean;
  userId: string;
  tempPassword?: string;
  error?: string;
}> {
  try {
    // 1. Check if user already exists in Firestore by email
    const { getAdminFirestore, getAdminApp } = await import("@/lib/firebase-admin");
    const admin = await import("firebase-admin");
    const db = getAdminFirestore();

    const app = getAdminApp();
    if (!app) return { isNew: false, userId: "", error: "Firebase not configured" };

    const emailNorm = data.email.toLowerCase().trim();
    const tempPassword = generateTempPassword();

    // Check Firestore users collection by email
    const existingUsers = await db
      .collection("users")
      .where("email", "==", emailNorm)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      // User already exists — reset password so we can send fresh credentials
      const existingDoc = existingUsers.docs[0];
      try {
        const uid = existingDoc.id;
        await admin.auth(app).updateUser(uid, { password: tempPassword });
      } catch {
        // If password reset fails, still return — email will show "use existing credentials"
        return { isNew: false, userId: existingDoc.id };
      }
      return { isNew: false, userId: existingDoc.id, tempPassword };
    }

    // 2. Check if Firebase Auth user exists by email
    let firebaseUid: string;

    try {
      const existingAuthUser = await admin.auth(app).getUserByEmail(emailNorm);
      // Auth user exists but no Firestore profile — reset password + create profile
      firebaseUid = existingAuthUser.uid;
      await admin.auth(app).updateUser(firebaseUid, { password: tempPassword });
    } catch {
      // No Firebase Auth user — create one
      const newUser = await admin.auth(app).createUser({
        email: emailNorm,
        password: tempPassword,
        displayName: data.fullName,
        disabled: false,
      });
      firebaseUid = newUser.uid;
    }

    // 3. Create Firestore profile
    await db.collection("users").doc(firebaseUid).set({
      uid: firebaseUid,
      email: emailNorm,
      displayName: data.fullName,
      phone: data.phone || "",
      role: "customer",
      company: "",
      specialization: "",
      photoURL: "",
      emailVerified: false,
      status: "active",
      candidateSccgId: data.sccgId,
      registeredByPartnerId: data.partnerId,
      registeredByPartnerName: data.partnerName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Create SharePoint Customer record (for auth.ts buildRolesForEmail)
    const { getCustomerByEmail, createCustomer } = await import("@/lib/sharepoint");
    const existingCustomer = await getCustomerByEmail(data.email);
    if (!existingCustomer) {
      await createCustomer({
        name: data.fullName,
        email: emailNorm,
        phone: data.phone,
        company: "",
        partnerId: data.partnerId,
        status: "active",
        passwordHash: await hash(tempPassword, 10),
      });
    }

    // 5. Create SharePoint UserProfile + UserRole for role engine
    const { getUserProfileByEmail, createUserProfile, createUserRole } = await import("@/lib/sharepoint");
    const existingProfile = await getUserProfileByEmail(data.email);
    if (!existingProfile) {
      const profile = await createUserProfile({
        firebaseUid,
        email: emailNorm,
        displayName: data.fullName,
        phone: data.phone,
        role: "customer",
        company: "",
        status: "active",
        createdAt: new Date().toISOString(),
      });

      await createUserRole({
        userAccountId: profile.id,
        role: "customer",
        status: "active",
        grantedAt: new Date().toISOString(),
        grantedBy: `partner:${data.partnerId}`,
      });
    }

    return { isNew: true, userId: firebaseUid, tempPassword };
  } catch (err) {
    console.error("[candidate-user] ensureCandidateUserAccount error:", err);
    return {
      isNew: false,
      userId: "",
      error: err instanceof Error ? err.message : "Failed to create user account",
    };
  }
}
