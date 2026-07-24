import "server-only";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "!1";
}

export interface PpmsUserResult {
  isNew: boolean;
  userId: string;
  tempPassword?: string;
  error?: string;
}

/**
 * Provision a PPMS user (viewer "project-partner" or manager "project-partner-admin")
 * scoped to an org. Creates a Firebase Auth login + Firestore profile carrying the role
 * and orgId so the NextAuth role engine resolves the correct console.
 */
export async function createPpmsUser(data: {
  email: string;
  fullName: string;
  role: "project-partner" | "project-partner-admin";
  orgId: string;
  orgName?: string;
}): Promise<PpmsUserResult> {
  try {
    const { getAdminFirestore, getAdminApp } = await import("@/lib/firebase-admin");
    const admin = await import("firebase-admin");
    const db = getAdminFirestore();
    const app = getAdminApp();
    if (!app) return { isNew: false, userId: "", error: "Firebase not configured" };

    const emailNorm = data.email.toLowerCase().trim();
    const tempPassword = generateTempPassword();

    const existing = await db.collection("users").where("email", "==", emailNorm).limit(1).get();
    if (!existing.empty) {
      const docRef = existing.docs[0];
      const uid = docRef.id;
      try {
        await admin.auth(app).updateUser(uid, { password: tempPassword });
      } catch {
        return { isNew: false, userId: uid };
      }
      // ensure role + orgId are up to date
      await db.collection("users").doc(uid).set(
        { role: data.role, orgId: data.orgId, orgName: data.orgName || "", updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return { isNew: false, userId: uid, tempPassword };
    }

    let firebaseUid: string;
    try {
      const authUser = await admin.auth(app).getUserByEmail(emailNorm);
      firebaseUid = authUser.uid;
      await admin.auth(app).updateUser(firebaseUid, { password: tempPassword });
    } catch {
      const created = await admin.auth(app).createUser({
        email: emailNorm,
        password: tempPassword,
        displayName: data.fullName,
        disabled: false,
      });
      firebaseUid = created.uid;
    }

    await db.collection("users").doc(firebaseUid).set({
      uid: firebaseUid,
      email: emailNorm,
      displayName: data.fullName,
      role: data.role,
      orgId: data.orgId,
      orgName: data.orgName || "",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { isNew: true, userId: firebaseUid, tempPassword };
  } catch (err) {
    console.error("createPpmsUser failed", err);
    return { isNew: false, userId: "", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Resolve the orgId stored on a user's Firestore profile (used for viewer scoping). */
export async function getOrgIdForUserEmail(email: string): Promise<string | null> {
  try {
    const { getAdminFirestore, getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) return null;
    const db = getAdminFirestore();
    const snap = await db.collection("users").where("email", "==", email.toLowerCase().trim()).limit(1).get();
    if (snap.empty) return null;
    const orgId = (snap.docs[0].data() as Record<string, unknown>).orgId;
    return orgId ? String(orgId) : null;
  } catch (err) {
    console.error("getOrgIdForUserEmail failed", err);
    return null;
  }
}

/** List PPMS users (viewers + admins) belonging to an org, from Firestore. */
export async function listPpmsUsers(orgId: string): Promise<Array<{ uid: string; email: string; displayName: string; role: string; status: string }>> {
  try {
    const { getAdminFirestore, getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) return [];
    const db = getAdminFirestore();
    const snap = await db.collection("users").where("orgId", "==", orgId).get();
    return snap.docs.map((d) => {
      const v = d.data() as Record<string, unknown>;
      return {
        uid: d.id,
        email: String(v.email || ""),
        displayName: String(v.displayName || ""),
        role: String(v.role || ""),
        status: String(v.status || "active"),
      };
    });
  } catch (err) {
    console.error("listPpmsUsers failed", err);
    return [];
  }
}

/** Retrieve all users carrying the project-partner or project-partner-admin roles. */
export async function getProjectPartnerUsers(): Promise<Array<{ id: string; email: string; displayName: string; role: string; orgId: string; orgName: string }>> {
  try {
    const { getAdminFirestore, getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) return [];
    const db = getAdminFirestore();
    
    // Fetch both roles in parallel
    const [snap1, snap2] = await Promise.all([
      db.collection("users").where("role", "==", "project-partner").get(),
      db.collection("users").where("role", "==", "project-partner-admin").get()
    ]);
    
    const users: Array<{ id: string; email: string; displayName: string; role: string; orgId: string; orgName: string }> = [];
    const pushUser = (doc: any) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email || "",
        displayName: data.displayName || data.fullName || "",
        role: data.role || "",
        orgId: data.orgId || "",
        orgName: data.orgName || ""
      });
    };
    
    snap1.docs.forEach(pushUser);
    snap2.docs.forEach(pushUser);
    
    // Sort alphabetically by display name
    return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (err) {
    console.error("getProjectPartnerUsers failed", err);
    return [];
  }
}
