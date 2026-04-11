"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { createCoinTransaction, getCoinWallet, createCoinWallet } from "@/lib/sharepoint";

export async function rechargeWalletAction(userId: string, userName: string, amount: number, description: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  if (amount <= 0) throw new Error("Amount must be positive");

  // Ensure wallet exists
  let wallet = await getCoinWallet(userId);
  if (!wallet) {
    wallet = await createCoinWallet({
      userId,
      userName,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await createCoinTransaction({
    walletId: wallet.id,
    userId,
    transactionType: "top-up",
    amount,
    runningBalance: wallet.balance + amount,
    description: description || `Admin top-up by ${user.name}`,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  });

  return { success: true };
}
