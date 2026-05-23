/**
 * Clients Repository — Firestore CRUD
 */
import { getDb } from "../firestore";
import type { Client } from "@/types";

const COLLECTION = "clients";

function now() {
  return new Date().toISOString();
}

export async function getClients(partnerId?: string): Promise<Client[]> {
  let q: FirebaseFirestore.Query = getDb().collection(COLLECTION).orderBy("name");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
}

export async function getClientById(id: string): Promise<Client | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as Client) : null;
}

export async function createClient(
  data: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<Client> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc } as Client;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteClient(id: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).delete();
}
