"use server";
import { getPartners } from "@/lib/sharepoint";
import { auth } from "@/auth";

export async function fetchReferralForCurrentUser() {
  const session = await auth();
  if (!session?.user || !session.user.id) return null;
  const partners = await getPartners();
  return partners.find((p) => p.id === session.user!.id) || null;
}
