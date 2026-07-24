"use server";
import { getCommissionLedger } from "@/lib/sharepoint";
import { getEffectiveSession } from "@/lib/effective-user";

export async function fetchCommissionsForCurrentUser() {
  const session = await getEffectiveSession();
  if (!session?.user?.id) return [];
  return getCommissionLedger(session.user.id);
}
