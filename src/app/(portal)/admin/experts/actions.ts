"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser, Expert } from "@/types";
import { assignExpertToPackage, createExpert, updateExpertStatus } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function assignExpertAction(packageId: string, expertId: string) {
  await requireAdmin();
  await assignExpertToPackage(packageId, expertId);
  redirect("/admin/experts");
}

/** Approve a pending expert — update Firestore status + create SharePoint record */
export async function approveExpertAction(firebaseUid: string) {
  await requireAdmin();
  const db = getAdminFirestore();

  // 1. Update Firestore profile status to "active"
  const userRef = db.collection("users").doc(firebaseUid);
  const snap = await userRef.get();
  if (!snap.exists) return { success: false, error: "User not found" };

  const profile = snap.data()!;
  await userRef.update({ status: "active", updatedAt: new Date().toISOString() });

  // 2. Create expert entry in SharePoint (if not already present)
  const expertData: Omit<Expert, "id"> & { id: string } = {
    id: firebaseUid,
    name: profile.displayName || "Expert",
    email: profile.email || "",
    phone: profile.phone || "",
    specialization: profile.specialization || "General",
    bio: "",
    status: "active",
    rating: 5,
    totalSessionsCompleted: 0,
    ratePerSession: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await createExpert(expertData);
  } catch (err) {
    console.error("Expert already exists or creation failed:", err);
  }

  revalidatePath("/admin/experts");
  return { success: true };
}

/** Reject / suspend a pending expert */
export async function rejectExpertAction(firebaseUid: string) {
  await requireAdmin();
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(firebaseUid);
  const snap = await userRef.get();
  if (!snap.exists) return { success: false, error: "User not found" };

  await userRef.update({ status: "suspended", updatedAt: new Date().toISOString() });

  // Also disable in SharePoint if exists
  try {
    await updateExpertStatus(firebaseUid, "inactive");
  } catch {
    // May not exist in SharePoint yet
  }

  revalidatePath("/admin/experts");
  return { success: true };
}

/** Get all pending expert applications from Firestore */
export async function getPendingExpertsAction() {
  await requireAdmin();
  const db = getAdminFirestore();
  const snap = await db.collection("users")
    .where("role", "==", "expert")
    .where("status", "==", "pending")
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      uid: doc.id,
      displayName: d.displayName || "",
      email: d.email || "",
      phone: d.phone || "",
      specialization: d.specialization || "",
      company: d.company || "",
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt || "",
    };
  });
}
