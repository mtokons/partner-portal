/**
 * Products Repository — Firestore CRUD
 */
import { getDb } from "../firestore";
import type { Product } from "@/types";

const COLLECTION = "products";

function now() {
  return new Date().toISOString();
}

export async function getProducts(): Promise<Product[]> {
  const snap = await getDb().collection(COLLECTION).orderBy("sortOrder").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}

export async function getAvailableProducts(): Promise<Product[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("isAvailable", "==", true)
    .orderBy("sortOrder")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}

export async function getProductById(id: string): Promise<Product | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as Product) : null;
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc } as Product;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteProduct(id: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(id).delete();
}
