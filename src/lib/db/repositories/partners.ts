/**
 * Partners Repository — Firestore CRUD
 */
import { getDb } from "../firestore";
import type { Partner } from "@/types";

const COLLECTION = "partners";

function now() {
  return new Date().toISOString();
}

export async function getPartners(): Promise<Partner[]> {
  const snap = await getDb().collection(COLLECTION).orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Partner);
}

export async function getPartnerByEmail(email: string): Promise<Partner | null> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Partner;
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as Partner) : null;
}

export async function createPartner(
  data: Omit<Partner, "id" | "createdAt" | "updatedAt">
): Promise<Partner> {
  const doc = { ...data, email: data.email.toLowerCase(), createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc } as Partner;
}

export async function updatePartner(id: string, data: Partial<Partner>): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).update({ ...data, updatedAt: now() });
}

export async function updatePartnerStatus(id: string, status: Partner["status"]): Promise<void> {
  await updatePartner(id, { status });
}

export async function approvePartner(id: string): Promise<void> {
  await updatePartner(id, { onboardingStatus: "approved", status: "active" });
}
