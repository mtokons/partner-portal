"use server";

import { assertAdmin } from "@/lib/admin-guard";
import { getAdminFirestore, getAdminApp, setCustomUserClaims } from "@/lib/firebase-admin";
import { writeAuditLog } from "@/lib/audit-log";
import * as admin from "firebase-admin";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "!1";
}

export async function createSystemUserAction(data: {
  email: string;
  displayName: string;
  role: string;
  company?: string;
}): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    await assertAdmin();

    const emailNorm = data.email.toLowerCase().trim();
    if (!emailNorm || !data.displayName.trim()) {
      return { success: false, error: "Name and email are required." };
    }

    const tempPassword = generateTempPassword();
    const db = getAdminFirestore();
    const app = getAdminApp();

    let uid = "";

    if (app) {
      try {
        const existingAuth = await admin.auth(app).getUserByEmail(emailNorm);
        uid = existingAuth.uid;
        await admin.auth(app).updateUser(uid, {
          displayName: data.displayName,
          password: tempPassword,
        });
      } catch {
        const createdAuth = await admin.auth(app).createUser({
          email: emailNorm,
          password: tempPassword,
          displayName: data.displayName,
          disabled: false,
        });
        uid = createdAuth.uid;
      }
      try {
        await setCustomUserClaims(uid, { role: data.role });
      } catch {
        /* non-fatal */
      }
    } else {
      uid = `user-${Date.now()}`;
    }

    // Save/Update in Firestore users collection
    await db.collection("users").doc(uid).set(
      {
        uid,
        email: emailNorm,
        displayName: data.displayName.trim(),
        role: data.role,
        roles: [data.role],
        company: data.company || "",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, password: tempPassword };
  } catch (err: any) {
    console.error("createSystemUserAction error:", err);
    return { success: false, error: err?.message || "Failed to create user." };
  }
}

export async function updateUserStatusAction(data: {
  userId: string;
  email: string;
  status: "active" | "suspended";
  role?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();

    const db = getAdminFirestore();
    const app = getAdminApp();

    // 1. Update Firestore user document
    const snap = await db.collection("users").where("email", "==", data.email.toLowerCase().trim()).limit(1).get();
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      const updatePayload: Record<string, any> = {
        status: data.status,
        updatedAt: new Date().toISOString(),
      };
      if (data.role) {
        updatePayload.role = data.role;
        updatePayload.roles = [data.role];
      }
      await docRef.update(updatePayload);
    } else if (data.userId) {
      const updatePayload: Record<string, any> = {
        status: data.status,
        updatedAt: new Date().toISOString(),
      };
      if (data.role) {
        updatePayload.role = data.role;
        updatePayload.roles = [data.role];
      }
      await db.collection("users").doc(data.userId).set(updatePayload, { merge: true });
    }

    // 2. Disable/enable the Firebase Auth account — this is what actually blocks
    //    login. Resolve the real Auth UID from the email (the table row id is not
    //    always the Auth UID) and revoke existing sessions when suspending.
    if (app) {
      const emailNorm = data.email.toLowerCase().trim();
      let uid = "";
      try {
        uid = (await admin.auth(app).getUserByEmail(emailNorm)).uid;
      } catch {
        uid = data.userId || "";
      }
      if (uid) {
        try {
          await admin.auth(app).updateUser(uid, {
            disabled: data.status === "suspended",
          });
          if (data.status === "suspended") {
            await admin.auth(app).revokeRefreshTokens(uid);
          }
          if (data.role) {
            await setCustomUserClaims(uid, { role: data.role });
          }
        } catch {
          /* non-fatal */
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateUserStatusAction error:", err);
    return { success: false, error: err?.message || "Failed to update user." };
  }
}

/**
 * Permanently delete a user. Removes the Firebase Auth account (so the person can
 * never sign in again — Firebase Auth alone, not Firestore, is what authorizes an
 * ID token) AND every matching Firestore `users` document. Best-effort mirrors the
 * removal to SharePoint and writes an audit entry.
 */
export async function deleteUserAction(data: {
  userId?: string;
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await assertAdmin();

    const emailNorm = (data.email || "").toLowerCase().trim();
    if (!emailNorm) return { success: false, error: "Email is required." };

    const db = getAdminFirestore();
    const app = getAdminApp();

    // 1. Delete the Firebase Auth account (resolve UID from email first).
    let uid = "";
    if (app) {
      try {
        uid = (await admin.auth(app).getUserByEmail(emailNorm)).uid;
      } catch {
        uid = data.userId || "";
      }
      if (uid) {
        try {
          await admin.auth(app).deleteUser(uid);
        } catch (e) {
          console.warn("[deleteUserAction] Auth delete failed:", e);
        }
      }
    }

    // 2. Delete every Firestore users doc that matches (by email and by uid).
    try {
      const byEmail = await db
        .collection("users")
        .where("email", "==", emailNorm)
        .get();
      await Promise.all(byEmail.docs.map((d) => d.ref.delete()));
      if (uid) await db.collection("users").doc(uid).delete().catch(() => {});
      if (data.userId) await db.collection("users").doc(data.userId).delete().catch(() => {});
    } catch (e) {
      console.warn("[deleteUserAction] Firestore delete failed:", e);
    }

    // 3. Best-effort SharePoint mirror.
    try {
      const { updateUserProfile } = await import("@/lib/sharepoint");
      await updateUserProfile(emailNorm, { status: "suspended" });
    } catch {
      /* SharePoint unavailable or no profile — non-fatal */
    }

    // 4. Immutable audit trail.
    try {
      await writeAuditLog({
        action: "user.delete",
        actorId: actor.id || "",
        actorEmail: actor.email || "",
        targetId: uid || emailNorm,
        targetType: "user",
        metadata: { email: emailNorm },
      });
    } catch {
      /* audit failure must not block the operation */
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteUserAction error:", err);
    return { success: false, error: err?.message || "Failed to delete user." };
  }
}

/**
 * Robust, dedicated role + profile update.
 *
 * Firestore `users/{firebaseUid}` is the authoritative identity/auth store that
 * login (`src/auth.ts`) reads. This action guarantees the role change lands on
 * the EXACT document login reads by resolving the Firebase Auth UID first, then:
 *  - updates the Firestore users doc (creating it keyed by the Auth UID if missing),
 *  - sets Firebase Auth custom claims,
 *  - best-effort mirrors the change to SharePoint UserProfiles,
 *  - writes an immutable audit log entry.
 *
 * NOTE: roles are baked into the NextAuth JWT at login, so the affected user must
 * sign out and back in for the new role to take effect in their session.
 */
export async function updateUserRoleAction(data: {
  userId?: string;
  email: string;
  role: string;
  displayName?: string;
  company?: string;
  /** Optional landing dashboard path; empty string clears the override. */
  dashboardOverride?: string;
  category?: string;
}): Promise<{ success: boolean; error?: string; note?: string }> {
  try {
    const actor = await assertAdmin();

    const emailNorm = (data.email || "").toLowerCase().trim();
    const role = (data.role || "").trim();
    if (!emailNorm || !role) {
      return { success: false, error: "Email and role are required." };
    }

    let db: FirebaseFirestore.Firestore | null = null;
    try {
      db = getAdminFirestore();
    } catch {
      // Allow proceeding for SharePoint-only updates in local mock mode
    }
    const app = getAdminApp();

    // 1. Resolve the Firebase Auth UID (the key login uses for users/{uid}).
    let uid = "";
    if (app) {
      try {
        uid = (await admin.auth(app).getUserByEmail(emailNorm)).uid;
      } catch {
        /* no matching Firebase Auth user — continue with email-based doc */
      }
    }

    // 2. Locate the authoritative Firestore users doc (if db is available).
    let docRef: FirebaseFirestore.DocumentReference | null = null;
    let before: Record<string, any> | undefined;

    if (db) {
      const byEmail = await db
        .collection("users")
        .where("email", "==", emailNorm)
        .limit(1)
        .get();

      if (!byEmail.empty) {
        docRef = byEmail.docs[0].ref;
        before = byEmail.docs[0].data();
      } else if (uid) {
        docRef = db.collection("users").doc(uid);
        before = (await docRef.get()).data();
      } else if (data.userId) {
        docRef = db.collection("users").doc(data.userId);
        before = (await docRef.get()).data();
      } else {
        docRef = db.collection("users").doc(emailNorm);
      }
    }

    // 3. Write the role + optional profile fields (merge so we never clobber).
    const payload: Record<string, any> = {
      email: emailNorm,
      role,
      roles: [role],
      updatedAt: new Date().toISOString(),
    };
    if (uid) payload.uid = uid;
    if (data.displayName?.trim()) payload.displayName = data.displayName.trim();
    if (data.company !== undefined) payload.company = (data.company || "").trim();
    if (data.category !== undefined) payload.category = (data.category || "").trim();
    if (data.dashboardOverride !== undefined) {
      const dash = (data.dashboardOverride || "").trim();
      payload.dashboardOverride = dash.startsWith("/") ? dash : "";
    }
    if (!before) {
      payload.status = "active";
      payload.createdAt = new Date().toISOString();
    }
    if (docRef) {
      await docRef.set(payload, { merge: true });
    }

    // 4. Sync Firebase Auth custom claims so token-based checks agree.
    if (uid) {
      try {
        await setCustomUserClaims(uid, { role });
      } catch {
        /* non-fatal */
      }
    }

    // 5. Best-effort mirror to SharePoint UserProfiles (non-fatal).
    try {
      const { updateUserProfile } = await import("@/lib/sharepoint");
      const profileUpdate: any = { role };
      if (data.category !== undefined) profileUpdate.category = (data.category || "").trim();
      await updateUserProfile(emailNorm, profileUpdate);
    } catch {
      /* SharePoint unavailable or no profile — Firestore remains authoritative */
    }

    // 6. Immutable audit trail.
    try {
      await writeAuditLog({
        action: "user.role.change",
        actorId: actor.id || "",
        actorEmail: actor.email || "",
        targetId: uid || emailNorm,
        targetType: "user",
        before: before ? { role: before.role ?? null } : undefined,
        after: { role },
        metadata: { email: emailNorm },
      });
    } catch {
      /* audit failure must not block the operation */
    }

    return {
      success: true,
      note: "Role saved. The user must sign out and back in for it to take effect.",
    };
  } catch (err: any) {
    console.error("updateUserRoleAction error:", err);
    if (err?.message === "Firebase Admin not initialized") {
      return {
        success: false,
        error: "Role changes are temporarily unavailable because Firebase Admin is not configured on the server.",
      };
    }
    return { success: false, error: err?.message || "Failed to update role." };
  }
}
