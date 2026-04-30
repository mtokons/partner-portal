"use server";

import {
  getCoinWallet,
  getGiftCards,
  getGiftCardByNumber,
  createGiftCardTransaction,
  createCoinTransaction,
  updateGiftCard,
} from "@/lib/sharepoint";
import { auth } from "@/auth";
import { verifyPin } from "@/lib/pin";

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

export async function redeemGiftCardToCoinsAction(cardNumber: string, pin: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (!cardNumber || !pin) throw new Error("Card number and PIN are required.");

  const card = await getGiftCardByNumber(cardNumber);
  // Generic message to avoid card-number enumeration.
  if (!card) throw new Error("Invalid card or PIN.");

  // Ownership check: only the issued-to user (or admin) may redeem.
  const roles = (session.user as { roles?: string[] }).roles || [];
  const isAdmin = roles.includes("admin") || roles.includes("finance");
  if (!isAdmin && card.issuedToUserId !== userId) {
    throw new Error("Invalid card or PIN.");
  }

  if (card.status !== "active") throw new Error(`Card is ${card.status}. Cannot redeem.`);

  // Lockout after too many failed attempts.
  if ((card.pinAttempts ?? 0) >= 5) {
    await updateGiftCard(card.id, { status: "frozen" });
    throw new Error("Too many failed attempts. Card has been frozen. Contact support.");
  }

  if (!verifyPin(pin, card.pinHash)) {
    await updateGiftCard(card.id, { pinAttempts: (card.pinAttempts ?? 0) + 1 });
    throw new Error("Invalid card or PIN.");
  }

  const amount = card.currentBalance;
  if (amount <= 0) throw new Error("This card has zero balance.");

  // Mark card redeemed FIRST so a concurrent redeem call sees status!=active.
  await updateGiftCard(card.id, {
    status: "depleted",
    currentBalance: 0,
    balance: 0,
    pinAttempts: 0,
  });

  try {
    await createGiftCardTransaction({
      sccgCardId: card.id,
      giftCardId: card.id,
      transactionType: "redeem",
      type: "redeem",
      amount: -amount,
      runningBalance: 0,
      balanceAfter: 0,
      description: `Redeemed to SCCG Coins by user ${userId}`,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    });

    await createCoinTransaction({
      walletId: userId,
      userId,
      transactionType: "top-up",
      amount: amount,
      runningBalance: amount,
      description: `Redeemed from Gift Card ${cardNumber}`,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    });
  } catch (err) {
    // Compensating rollback if ledger write fails.
    await updateGiftCard(card.id, {
      status: "active",
      currentBalance: amount,
      balance: amount,
    }).catch(() => {});
    throw err;
  }

  return { success: true, amount };
}
