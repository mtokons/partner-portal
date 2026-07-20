"use server";
import { getPartners } from "@/lib/sharepoint";
import { getEffectiveSession } from "@/lib/effective-user";

export async function fetchReferralForCurrentUser() {
  const session = await getEffectiveSession();
  if (!session?.user || !session.user.id) return null;
  const partners = await getPartners();
  return partners.find((p) => p.id === session.user!.id) || null;
}
