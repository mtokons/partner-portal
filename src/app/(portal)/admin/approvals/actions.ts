"use server";

import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase-admin";

import { createExpert, getExpertById } from "@/lib/sharepoint";
import type { Expert } from "@/types";

export async function approveUserAction(uid: string) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userSnap.data();

    // 1. Mark as active in Firestore
    await userRef.update({
      status: "active",
      updatedAt: new Date(),
    });

    // 2. If it's an expert, sync to SharePoint
    if (userData?.role === "expert") {
      const existing = await getExpertById(uid);
      if (!existing) {
        await createExpert({
          id: uid, // Use Firebase UID as the lookup key in SharePoint
          name: userData.displayName || "Expert",
          email: userData.email,
          phone: userData.phone || "",
          specialization: userData.specialization || "General",
          bio: "",
          status: "active",
          rating: 5, // Initial rating
          totalSessionsCompleted: 0,
          ratePerSession: 0,
          createdAt: new Date().toISOString(),
        } as Expert);
      }
    }

    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve user";
    return { success: false, error: msg };
  }
}

export async function rejectUserAction(uid: string) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);
    
    await userRef.update({
      status: "suspended", // Suspend so we have a record, instead of deleting fully
      updatedAt: new Date(),
    });

    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reject user";
    return { success: false, error: msg };
  }
}
