/**
 * Sales Repository — Offers & Orders, Firestore CRUD
 */
import { getDb } from "../firestore";
import type { SalesOffer, SalesOrder } from "@/types";

const OFFERS = "salesOffers";
const ORDERS = "salesOrders";

function now() {
  return new Date().toISOString();
}

// ── Offers ──

export async function getSalesOffers(partnerId?: string): Promise<SalesOffer[]> {
  let q: FirebaseFirestore.Query = getDb().collection(OFFERS).orderBy("createdAt", "desc");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesOffer);
}

export async function getSalesOfferById(id: string): Promise<SalesOffer | null> {
  const doc = await getDb().collection(OFFERS).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as SalesOffer) : null;
}

export async function createSalesOffer(
  data: Omit<SalesOffer, "id" | "createdAt" | "updatedAt">
): Promise<SalesOffer> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection(OFFERS).add(doc);
  return { id: ref.id, ...doc } as SalesOffer;
}

export async function updateSalesOffer(id: string, data: Partial<SalesOffer>): Promise<void> {
  await getDb().collection(OFFERS).doc(id).update({ ...data, updatedAt: now() });
}

// ── Orders ──

export async function getSalesOrders(partnerId?: string): Promise<SalesOrder[]> {
  let q: FirebaseFirestore.Query = getDb().collection(ORDERS).orderBy("createdAt", "desc");
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesOrder);
}

export async function getSalesOrderById(id: string): Promise<SalesOrder | null> {
  const doc = await getDb().collection(ORDERS).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as SalesOrder) : null;
}

export async function createSalesOrder(
  data: Omit<SalesOrder, "id" | "createdAt" | "updatedAt">
): Promise<SalesOrder> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await getDb().collection(ORDERS).add(doc);
  return { id: ref.id, ...doc } as SalesOrder;
}

export async function updateSalesOrder(id: string, data: Partial<SalesOrder>): Promise<void> {
  await getDb().collection(ORDERS).doc(id).update({ ...data, updatedAt: now() });
}

/** Generate a sequential offer/order number like SO-2026-00001 */
export async function generateNumber(prefix: "SO" | "ORD"): Promise<string> {
  const year = new Date().getFullYear();
  const collection = prefix === "SO" ? OFFERS : ORDERS;
  const field = prefix === "SO" ? "offerNumber" : "orderNumber";

  const snap = await getDb()
    .collection(collection)
    .orderBy(field, "desc")
    .limit(1)
    .get();

  let seq = 1;
  if (!snap.empty) {
    const lastNumber = (snap.docs[0].data() as Record<string, string>)[field] || "";
    const parts = lastNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] || "0", 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}
