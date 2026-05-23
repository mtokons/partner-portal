/**
 * Users Repository — Firestore CRUD
 */
import { getDb } from "../firestore";
import type { SessionUser } from "@/types";

const COLLECTION = "users";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  roles?: string[];
  partnerId?: string;
  company?: string;
  status: "active" | "pending" | "suspended";
  createdAt: string;
}

export async function getUsers(): Promise<UserProfile[]> {
  const snap = await getDb().collection(COLLECTION).orderBy("email").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as UserProfile) : null;
}

export async function updateUserStatus(id: string, status: UserProfile["status"]): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).update({ status });
}
