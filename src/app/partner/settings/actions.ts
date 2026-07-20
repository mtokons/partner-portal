"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function updatePartnerProfile(data: {
  phone?: string;
  company?: string;
  preferredCurrency?: string;
  logoUrl?: string;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not a partner");

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Partner not found");

  // Use graphPatch directly since no generic update exists
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, string | undefined> = {};
  if (data.phone !== undefined) fields["Phone"] = data.phone;
  if (data.company !== undefined) fields["Company"] = data.company;
  if (data.preferredCurrency !== undefined) fields["PreferredCurrency"] = data.preferredCurrency;
  if (data.logoUrl !== undefined) fields["LogoUrl"] = data.logoUrl;

  if (Object.keys(fields).length > 0) {
    await graphPatch(`${await getSiteListUrlAsync("Partners")}/${partner.id}/fields`, fields);
  }

  revalidatePath("/partner/settings");
  return { success: true };
}

export async function savePartnerPaymentInfo(data: {
  accountHolderName?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  accountNumber?: string;
  paymentNote?: string;
  bkashNumber?: string;
  nagadNumber?: string;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not a partner");

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Partner not found");

  const { getAdminFirestore } = await import("@/lib/firebase-admin");
  const db = getAdminFirestore();
  await db.collection("partnerPaymentInfo").doc(partner.id).set(
    { ...data, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  revalidatePath("/partner/settings");
  return { success: true };
}

export interface PartnerPaymentData {
  accountHolderName?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  accountNumber?: string;
  paymentNote?: string;
  bkashNumber?: string;
  nagadNumber?: string;
}

export async function getPartnerPaymentInfoForSettings(): Promise<PartnerPaymentData | null> {
  const session = await getEffectiveSession();
  if (!session?.user) return null;
  const user = session.user as SessionUser;
  if (!user.partnerId) return null;

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return null;

  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = getAdminFirestore();
    const doc = await db.collection("partnerPaymentInfo").doc(partner.id).get();
    if (!doc.exists) return null;
    return doc.data() as PartnerPaymentData;
  } catch {
    return null;
  }
}

export async function getPartnerPaymentInfoById(partnerId: string): Promise<PartnerPaymentData | null> {
  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = getAdminFirestore();
    const doc = await db.collection("partnerPaymentInfo").doc(partnerId).get();
    if (!doc.exists) return null;
    return doc.data() as PartnerPaymentData;
  } catch {
    return null;
  }
}

