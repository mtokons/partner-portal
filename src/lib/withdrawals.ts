import { getAdminFirestore } from "@/lib/firebase-admin";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types";

export async function getWithdrawalRequests(expertId?: string): Promise<WithdrawalRequest[]> {
  const db = getAdminFirestore();
  let query: FirebaseFirestore.Query = db.collection("withdrawalRequests");

  if (expertId) {
    query = query.where("expertId", "==", expertId);
  }

  const snap = await query.get();

  const requests = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      expertId: data.expertId,
      expertName: data.expertName,
      amount: data.amount,
      currency: data.currency || "BDT",
      status: data.status,
      paymentMethodType: data.paymentMethodType,
      paymentMethodDetails: data.paymentMethodDetails,
      notes: data.notes,
      requestedAt: data.requestedAt,
      processedAt: data.processedAt,
    } as WithdrawalRequest;
  });

  // Sort in memory to avoid requiring a composite index in Firestore
  return requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export async function createWithdrawalRequest(data: Omit<WithdrawalRequest, "id">): Promise<WithdrawalRequest> {
  const db = getAdminFirestore();
  const docRef = db.collection("withdrawalRequests").doc();
  
  const payload = {
    ...data,
    id: docRef.id,
  };

  await docRef.set(payload);
  
  return payload as WithdrawalRequest;
}

export async function updateWithdrawalRequestStatus(id: string, status: WithdrawalStatus, notes?: string): Promise<void> {
  const db = getAdminFirestore();
  const updates: any = {
    status,
    processedAt: new Date().toISOString()
  };
  
  if (notes) {
    updates.notes = notes;
  }

  await db.collection("withdrawalRequests").doc(id).update(updates);
}

export async function updateExpertPaymentPreferences(expertId: string, methodType: string, methodDetails: string): Promise<void> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(expertId);
  
  await userRef.set({
    paymentMethodType: methodType,
    paymentMethodDetails: methodDetails,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
