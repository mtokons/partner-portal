"use server";

import { revalidatePath } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function approveUserAction(uid: string) {
  try {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);
    
    await userRef.update({
      status: "active",
      updatedAt: new Date(),
    });

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
