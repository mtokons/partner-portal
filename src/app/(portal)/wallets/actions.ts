"use server";
import { getCoinWallet, getGiftCards } from "@/lib/sharepoint";
import { auth } from "@/auth";

export async function fetchWalletsForCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const wallet = await getCoinWallet(session.user.id);
  return wallet ? [wallet] : [];
}

export async function fetchUserCardsAction() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return await getGiftCards(session.user.id);
}
