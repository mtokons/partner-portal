"use server";
import { getCommissionLedger } from "@/lib/sharepoint";
import { auth } from "@/auth";

export async function fetchCommissionsForCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getCommissionLedger(session.user.id);
}
