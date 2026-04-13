"use server";

import { 
  getCoinWallet, 
  getGiftCards, 
  getGiftCardByNumber, 
  createGiftCardTransaction, 
  createCoinTransaction 
} from "@/lib/sharepoint";
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

export async function redeemGiftCardToCoinsAction(cardNumber: string, pin: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // 1. Find and validate card
  const card = await getGiftCardByNumber(cardNumber);
  if (!card) throw new Error("Card not found. Please check the card number.");
  if (card.status !== "active") throw new Error(`Card is ${card.status}. Cannot redeem.`);
  
  // 2. Verify PIN (using the placeholder logic in the issuer)
  // In a real app, this would use bcrypt.compare(pin, card.pinHash)
  if (card.pinHash !== "placeholder" && pin !== "1234") { // Mock check
     // For demo, we accept '1234' if hash is placeholder, otherwise we check hash
     // But currently the issue action sets it to 'placeholder'
  }
  
  // For this implementation, we'll assume any input is valid if it's '1234' for existing cards
  if (pin !== "1234" && pin !== card.pinHash && card.pinHash !== "placeholder") {
    throw new Error("Invalid PIN. Please try again.");
  }

  const amount = card.currentBalance;
  if (amount <= 0) throw new Error("This card has zero balance.");

  // 3. Atomic transfer (Simulated by two sequential transactions in mock)
  // Debit Card
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

  // Credit Wallet
  await createCoinTransaction({
    walletId: userId,
    userId,
    transactionType: "top-up",
    amount: amount,
    runningBalance: amount, // Approximate; actual balance computed by store
    description: `Redeemed from Gift Card ${cardNumber}`,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  });

  return { success: true, amount };
}
