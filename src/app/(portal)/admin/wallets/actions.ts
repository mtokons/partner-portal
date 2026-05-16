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
      userEmail: "", // Required but not available here
      userName,
      balance: 0,
      currency: "SCCG",
      totalEarned: 0,
      totalSpent: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    // 1. Create the history record
    await createCoinTransaction({
      walletId: wallet.id,
      userId,
      transactionType: "top-up",
      amount,
      runningBalance: (wallet.balance || 0) + amount,
      description: description || `Admin top-up by ${user.name}`,
      createdAt: new Date().toISOString(),
      referenceId: `admin-${Date.now()}`,
    } as any);

    // 2. Update the wallet's actual balance and total earned
    await (await import("@/lib/sharepoint")).updateCoinWallet(userId, {
      balance: (wallet.balance || 0) + amount,
      totalEarned: (wallet.totalEarned || 0) + amount,
    });

    return { success: true };
  } catch (error) {
    console.error("Wallet recharge failed:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to recharge wallet in SharePoint");
  }
}
