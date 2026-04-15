"use server";

import { revalidatePath } from "next/cache";
import { getAllUserProfiles, updateUserProfileRoles, createUserProfile, createUserRole } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { UserRoleType, UserProfile } from "@/types";

export async function fetchAllUsersAction() {
  try {
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
    // Update SharePoint (our existing role engine)
    await updateUserProfileRoles(userId, roles);
    
    // Also update primary role in Firestore if 'admin' is in roles
    const db = getAdminFirestore();
    const primaryRole = roles.includes("admin") ? "admin" : roles[0] || "customer";
    await db.collection("users").doc(userId).update({ 
      role: primaryRole,
      updatedAt: new Date().toISOString() 
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update roles" };
  }
}

export async function createUserAction(data: Omit<UserProfile, "id">) {
  try {
    const db = getAdminFirestore();
    
    // 1. Create in Firestore
    const docRef = await db.collection("users").add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Create in SharePoint for secondary roles/tracking
    // We pass the firestore ID as firebaseUid to SharePoint
    await createUserProfile({ 
      ...data, 
      firebaseUid: docRef.id 
    } as Omit<UserProfile, "id">);

    await createUserRole({
      userAccountId: docRef.id,
      role: data.role as UserRoleType,
      status: "active",
      grantedAt: new Date().toISOString(),
      grantedBy: "admin"
    });

    revalidatePath("/admin/users");
    return { success: true, user: { ...data, id: docRef.id } };
  } catch (error: any) {
    console.error("Create user error:", error);
    return { success: false, error: error.message || "Failed to create user" };
  }
}
