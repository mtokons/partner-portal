"use server";

import { revalidatePath } from "next/cache";
import { getAllUserProfiles, updateUserProfileRoles, createUserProfile, createUserRole } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { UserRoleType, UserProfile } from "@/types";
import { assertAdmin } from "@/lib/admin-guard";

/**
 * Set (or reset) the Firebase Auth password for an existing user and return
 * the new password to the admin. Useful for users created before this fix.
 */
export async function resetUserPasswordAction(email: string, customPassword?: string) {
  try {
    await assertAdmin();
    const { getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) throw new Error("Firebase Admin not initialised");
    const firebaseAdmin = (await import("firebase-admin")).default;

    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const tempPassword = customPassword || Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    let authUser;
    try {
      authUser = await firebaseAdmin.auth(app).getUserByEmail(email);
    } catch {
      // No Firebase Auth account — create one
      authUser = await firebaseAdmin.auth(app).createUser({ email, password: tempPassword });
    }
    await firebaseAdmin.auth(app).updateUser(authUser.uid, { password: tempPassword });

    return { success: true, tempPassword };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reset password" };
  }
}

export async function fetchAllUsersAction() {
  try {
    await assertAdmin();
    const db = getAdminFirestore();
    const snapshot = await db.collection("users").get();
    
    // Get all profiles from Firestore
    const firestoreUsers = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        displayName: d.displayName || "",
        email: d.email || "",
        phone: d.phone || "",
        role: d.role || "customer",
        company: d.company || "",
        status: d.status || "active",
        registeredByPartnerName: d.registeredByPartnerName || "",
        registeredByPartnerId: d.registeredByPartnerId || "",
        candidateSccgId: d.candidateSccgId || "",
        isTestData: d.isTestData === true,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || d.updatedAt || new Date().toISOString(),
      };
    });

    // Also fetch SharePoint roles to maintain synchronization
    const spUsers = await getAllUserProfiles();
    const spRolesMap = new Map(spUsers.map(u => [u.email.toLowerCase(), u.roles]));

    // Merge: Use Firestore as source of profile, but SharePoint as source of granular roles
    const mergedUsers = firestoreUsers.map(u => ({
      ...u,
      roles: spRolesMap.get(u.email.toLowerCase()) || [u.role]
    }));

    return { success: true, data: mergedUsers };
  } catch (error: any) {
    console.error("Fetch users error:", error);
    return { success: false, error: error.message || "Failed to fetch users" };
  }
}

export async function updateUserRolesAction(userId: string, roles: UserRoleType[]) {
  try {
    const actor = await assertAdmin();
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const email = userDoc.data()?.email;
    
    if (email) {
      const { getUserProfileByEmail } = await import("@/lib/sharepoint");
      const spProfile = await getUserProfileByEmail(email);
      if (spProfile) {
        await updateUserProfileRoles(spProfile.id, roles);
      }
    }
    
    // Also update primary role in Firestore
    const primaryRole = roles.includes("admin") ? "admin" : roles[0] || "customer";
    await db.collection("users").doc(userId).update({ 
      role: primaryRole,
      updatedAt: new Date().toISOString() 
    });

    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: actor.email,
        actorId: actor.id,
        actorName: actor.name || undefined,
        actorRole: "admin",
        action: "user_update",
        description: `Updated roles to [${roles.join(", ")}]`,
        targetId: userId,
        console: "admin",
      });
    } catch { /* non-fatal */ }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update roles" };
  }
}

export async function createUserAction(data: Omit<UserProfile, "id">) {
  try {
    const actor = await assertAdmin();
    const db = getAdminFirestore();
    const { getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) throw new Error("Firebase Admin not initialised");

    const firebaseAdmin = (await import("firebase-admin")).default;

    // Generate a secure temporary password
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const tempPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    // 1. Create Firebase Auth account (this is what enables login)
    let authUid: string;
    try {
      const authUser = await firebaseAdmin.auth(app).createUser({
        email: data.email,
        password: tempPassword,
        displayName: data.displayName || undefined,
      });
      authUid = authUser.uid;
    } catch (authErr: any) {
      // If the account already exists in Auth (e.g. self-registered), get their UID
      if (authErr.code === "auth/email-already-exists") {
        const existing = await firebaseAdmin.auth(app).getUserByEmail(data.email);
        authUid = existing.uid;
        // Update display name if missing
        if (!existing.displayName && data.displayName) {
          await firebaseAdmin.auth(app).updateUser(authUid, { displayName: data.displayName });
        }
      } else {
        throw authErr;
      }
    }

    // 2. Create / update Firestore user document (use Auth UID as doc ID)
    const now = new Date().toISOString();
    const docRef = db.collection("users").doc(authUid);
    await docRef.set({
      ...data,
      firebaseUid: authUid,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // 3. Create in SharePoint for secondary roles / tracking
    await createUserProfile({
      ...data,
      firebaseUid: authUid,
    } as Omit<UserProfile, "id">);

    await createUserRole({
      userAccountId: authUid,
      role: data.role as UserRoleType,
      status: "active",
      grantedAt: now,
      grantedBy: "admin",
    });

    // 4. If the role is "partner", auto-create an approved partner record
    if (data.role === "partner") {
      try {
        const { createPartner } = await import("@/lib/sharepoint");
        await createPartner({
          name: data.displayName || data.email,
          email: data.email,
          passwordHash: "",
          role: "partner",
          status: "active",
          company: (data as any).company || "",
          phone: (data as any).phone || "",
          partnerType: "individual",
          commissionTier: "standard",
          tierStatus: "Silver",
          marginPercentage: 8,
          onboardingStatus: "approved",
        });
      } catch (err) {
        console.error("Auto-create partner record failed:", err);
      }
    }

    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: actor.email,
        actorId: actor.id,
        actorName: actor.name || undefined,
        actorRole: "admin",
        action: "user_create",
        description: `Created user ${data.displayName || data.email} (${data.role})`,
        targetId: authUid,
        targetEmail: data.email,
        targetName: data.displayName || undefined,
        console: "admin",
      });
    } catch { /* non-fatal */ }

    revalidatePath("/admin/users");
    return { success: true, user: { ...data, id: authUid }, tempPassword };
  } catch (error: any) {
    console.error("Create user error:", error);
    return { success: false, error: error.message || "Failed to create user" };
  }
}

/**
 * Ensure a partner role user has an approved Partners list record.
 * Call this to fix existing admin-created partner users who see the pending screen.
 */
export async function ensurePartnerRecordAction(email: string, displayName?: string, company?: string) {
  try {
    await assertAdmin();
    const { getPartnerByEmail, createPartner, approvePartnerOnboarding, updatePartnerTierAndMargin } = await import("@/lib/sharepoint");
    const existing = await getPartnerByEmail(email);
    if (!existing) {
      await createPartner({
        name: displayName || email,
        email,
        passwordHash: "",
        role: "partner",
        status: "active",
        company: company || "",
        phone: "",
        partnerType: "individual",
        commissionTier: "standard",
        tierStatus: "Silver",
        marginPercentage: 8,
        onboardingStatus: "approved",
      });
    } else if (existing.onboardingStatus !== "approved") {
      await approvePartnerOnboarding(existing.id);
      await updatePartnerTierAndMargin(existing.id, existing.tierStatus || "Silver", existing.marginPercentage || 8);
    }
    revalidatePath("/admin/users");
    return { success: true, existed: !!existing };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sync partner record" };
  }
}

// ============================================================
// Super-admin destructive operations (delete + test-data flag)
// ============================================================

import { assertSuperAdmin, isSuperAdminEmail } from "@/lib/admin-guard";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";

/** Whether the current session is a super-admin (controls UI gating). */
export async function checkSuperAdminAction(): Promise<{ isSuperAdmin: boolean }> {
  try {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = !!user && roles.includes("admin") && isSuperAdminEmail(user.email);
    return { isSuperAdmin };
  } catch {
    return { isSuperAdmin: false };
  }
}

/**
 * Toggle the test-data flag on a user. When flagged as test data, the user and
 * every business record owned by them (matched by partner ownership) are treated
 * as dummy data on admin dashboards.
 */
export async function setUserTestDataFlagAction(userId: string, isTestData: boolean) {
  try {
    await assertSuperAdmin();
    const db = getAdminFirestore();
    await db.collection("users").doc(userId).update({
      isTestData,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/overview");
    return { success: true };
  } catch (error: any) {
    console.error("setUserTestDataFlag error:", error);
    return { success: false, error: error.message || "Failed to update test-data flag" };
  }
}

/** Delete the Firebase Auth identity for an email (best-effort). */
async function deleteFirebaseAuthUser(email: string): Promise<void> {
  try {
    const admin = await import("firebase-admin");
    const { getAdminApp } = await import("@/lib/firebase-admin");
    const app = getAdminApp();
    if (!app) return;
    const authAdmin = admin.auth(app);
    const rec = await authAdmin.getUserByEmail(email).catch(() => null);
    if (rec) await authAdmin.deleteUser(rec.uid);
  } catch (e) {
    console.error("deleteFirebaseAuthUser error:", (e as Error).message);
  }
}

/**
 * Delete every business record that belongs to a user (by partner ownership).
 * Returns a per-list summary of how many items were removed.
 */
async function cascadeDeletePartnerData(partnerId: string): Promise<Record<string, number>> {
  const sp = await import("@/lib/sharepoint");
  const summary: Record<string, number> = {};

  // Candidates → their services first, then the candidate
  try {
    const candidates = await sp.getCandidates(partnerId);
    let candDeleted = 0;
    let svcDeleted = 0;
    for (const c of candidates) {
      svcDeleted += await sp.deleteListItemsByField("CandidateServices", "CandidateId", c.id);
      if (await sp.deleteListItemById("Candidates", c.id)) candDeleted++;
    }
    summary.candidates = candDeleted;
    summary.candidateServices = svcDeleted;
  } catch (e) { console.error("cascade candidates failed", (e as Error).message); }

  // Candidate tasks (linked directly by PartnerId)
  summary.candidateTasks = await sp.deleteListItemsByField("CandidateTasks", "PartnerId", partnerId);

  // Sales offers → their line items, then the offer
  try {
    const offers = await sp.getSalesOffers(partnerId);
    let offDeleted = 0;
    let itemDeleted = 0;
    for (const o of offers) {
      itemDeleted += await sp.deleteListItemsByField("SalesOfferItems", "SalesOfferId", o.id);
      if (await sp.deleteListItemById("SalesOffers", o.id)) offDeleted++;
    }
    summary.salesOffers = offDeleted;
    summary.salesOfferItems = itemDeleted;
  } catch (e) { console.error("cascade offers failed", (e as Error).message); }

  // Sales orders → their line items, then the order
  try {
    const orders = await sp.getSalesOrders(partnerId);
    let ordDeleted = 0;
    let itemDeleted = 0;
    for (const o of orders) {
      itemDeleted += await sp.deleteListItemsByField("SalesOrderItems", "SalesOrderId", o.id);
      if (await sp.deleteListItemById("SalesOrders", o.id)) ordDeleted++;
    }
    summary.salesOrders = ordDeleted;
    summary.salesOrderItems = itemDeleted;
  } catch (e) { console.error("cascade orders failed", (e as Error).message); }

  // Flat lists linked by PartnerId
  summary.orders = await sp.deleteListItemsByField("Orders", "PartnerId", partnerId);
  summary.invoices = await sp.deleteListItemsByField("Invoices", "PartnerId", partnerId);
  summary.installments = await sp.deleteListItemsByField("Installments", "PartnerId", partnerId);
  summary.financials = await sp.deleteListItemsByField("Financials", "PartnerId", partnerId);
  summary.b2bCompanies = await sp.deleteListItemsByField("B2BCompanies", "PartnerId", partnerId);

  return summary;
}

export type DeleteMode = "flag" | "account" | "all";

/**
 * Super-admin delete with three modes:
 *  - "flag":    mark the user (and, by ownership, their records) as test data. No deletion.
 *  - "account": delete the login identity only (Firebase Auth + Firestore doc + SharePoint
 *               profile/roles). Business records are kept.
 *  - "all":     delete the account AND every related business record (full cascade).
 */
export async function deleteUserAction(userId: string, email: string, mode: DeleteMode) {
  try {
    const actor = await assertSuperAdmin();
    const normalizedEmail = (email || "").trim();

    if (actor.email && normalizedEmail && actor.email.toLowerCase() === normalizedEmail.toLowerCase()) {
      return { success: false, error: "You cannot delete your own account." };
    }

    const db = getAdminFirestore();

    if (mode === "flag") {
      const res = await setUserTestDataFlagAction(userId, true);
      return res.success
        ? { success: true, mode, message: "User flagged as test data." }
        : res;
    }

    // Resolve partner (if any) for cascade / record ownership
    let partnerId: string | null = null;
    if (normalizedEmail) {
      try {
        const { getPartnerByEmail } = await import("@/lib/sharepoint");
        const partner = await getPartnerByEmail(normalizedEmail);
        partnerId = partner?.id || null;
      } catch (e) {
        console.error("resolve partner failed", (e as Error).message);
      }
    }

    let cascade: Record<string, number> | undefined;
    if (mode === "all" && partnerId) {
      cascade = await cascadeDeletePartnerData(partnerId);
      try {
        await import("@/lib/sharepoint").then((sp) => sp.deleteListItemById("Partners", partnerId!));
      } catch (e) { console.error("delete partner record failed", (e as Error).message); }
    }

    // Account identity removal (both "account" and "all")
    if (normalizedEmail) {
      await deleteFirebaseAuthUser(normalizedEmail);
      try {
        const { hardDeleteUserAccount } = await import("@/lib/sharepoint");
        await hardDeleteUserAccount(normalizedEmail);
      } catch (e) { console.error("hardDeleteUserAccount failed", (e as Error).message); }
    }

    // Firestore profile doc
    try {
      await db.collection("users").doc(userId).delete();
    } catch (e) { console.error("delete firestore user failed", (e as Error).message); }

    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: actor.email,
        actorId: actor.id,
        actorName: actor.name || undefined,
        actorRole: "admin",
        action: "user_delete",
        description: `Deleted user ${normalizedEmail} (mode: ${mode})`,
        targetId: userId,
        targetEmail: normalizedEmail,
        console: "admin",
      });
    } catch { /* non-fatal */ }

    revalidatePath("/admin/users");
    revalidatePath("/admin/overview");

    const message =
      mode === "all"
        ? `User and all related records deleted.${cascade ? " " + Object.entries(cascade).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ") : ""}`
        : "User account deleted (records preserved).";

    return { success: true, mode, message, cascade };
  } catch (error: any) {
    console.error("deleteUserAction error:", error);
    const msg = String(error?.message || "");
    if (msg.includes("super-admin")) {
      return { success: false, error: "Only a super-admin can delete users." };
    }
    return { success: false, error: msg || "Failed to delete user" };
  }
}

export async function fetchProjectOrgsAction() {
  try {
    await assertAdmin();
    const { getProjectOrgs } = await import("@/lib/project-orgs");
    const orgs = await getProjectOrgs();
    return { success: true, data: orgs.map(o => ({ id: o.id, name: o.name })) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch organisations" };
  }
}

export async function updateUserDetailsAction(
  userId: string,
  data: {
    displayName: string;
    phone: string;
    company: string;
    status: string;
    orgId: string;
    orgName: string;
    roles: UserRoleType[];
  }
) {
  try {
    const actor = await assertAdmin();
    const db = getAdminFirestore();

    // 1. Update roles in SharePoint (our existing role engine)
    await updateUserProfileRoles(userId, data.roles);

    // 2. Determine primary role in Firestore
    const primaryRole = data.roles.includes("admin") ? "admin" : data.roles[0] || "customer";

    // 3. Update Firestore profile including partner alignment fields
    await db.collection("users").doc(userId).update({
      displayName: data.displayName,
      phone: data.phone,
      company: data.company || data.orgName || "",
      status: data.status,
      role: primaryRole,
      orgId: data.orgId || "",
      orgName: data.orgName || "",
      registeredByPartnerId: data.orgId || "",
      registeredByPartnerName: data.orgName || "",
      partnerId: data.orgId || "",
      updatedAt: new Date().toISOString()
    });

    // 4. Log activity
    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        actorEmail: actor.email,
        actorId: actor.id,
        action: "update_user_profile",
        details: `Updated user profile and roles for ${userId} (${data.displayName})`
      });
    } catch {}

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update user details error:", error);
    return { success: false, error: error.message || "Failed to update user profile" };
  }
}

export async function fetchB2bPartnersAction() {
  try {
    await assertAdmin();
    const { getPartners } = await import("@/lib/sharepoint");
    const partners = await getPartners();
    return { success: true, data: partners.map(p => ({ id: p.id, name: p.name, company: p.company || p.name })) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch B2B partners" };
  }
}
