"use server";
import { getCoinWallet } from "@/lib/sharepoint";
import { auth } from "@/auth";

export async function fetchWalletsForCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const wallet = await getCoinWallet(session.user.id);
  return wallet ? [wallet] : [];
}
