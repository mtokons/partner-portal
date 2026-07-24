"use server";

import {
  getSccgCards,
  getSccgCardById,
  createSccgCard,
  updateSccgCard,
  deleteSccgCard,
  getSccgCardTransactions,
  createSccgCardTransaction,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import type { SccgCard, SccgCardTransaction } from "@/types";

export async function fetchCards(filters?: { clientId?: string; status?: string }) {
  await requirePermission("sccg-card.view");
  return getSccgCards(filters);
}

export async function fetchCardById(id: string) {
  await requirePermission("sccg-card.view");
  return getSccgCardById(id);
}

export async function fetchCardTransactions(cardId: string) {
  await requirePermission("sccg-card.view");
  return getSccgCardTransactions(cardId);
}

export async function issueCard(data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  tier: "standard" | "premium" | "platinum";
  initialBalance: number;
  currency: "BDT" | "EUR";
  notes?: string;
}) {
  const user = await requirePermission("sccg-card.create");

  const card = await createSccgCard({
    issuedToUserId: data.clientId,
    issuedToName: data.clientName,
    issuedToEmail: data.clientEmail,
    issuedByUserId: user.id,
    issuedBy: user.name,
    clientId: data.clientId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    tier: data.tier,
    balance: data.initialBalance,
    initialBalance: data.initialBalance,
    currentBalance: data.initialBalance,
    currency: data.currency,
    status: "active",
    designTemplate: "standard",
    notes: data.notes,
    pinHash: "", // Not used in this version
    activatedAt: new Date().toISOString(),
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    issuedAt: new Date().toISOString(),
  });

  // Record initial load transaction
  if (data.initialBalance > 0) {
    await createSccgCardTransaction({
      sccgCardId: card.id,
      cardId: card.id,
      transactionType: "load",
      type: "load",
      amount: data.initialBalance,
      currency: data.currency,
      runningBalance: data.initialBalance,
      balanceAfter: data.initialBalance,
      description: "Initial card load",
      createdAt: new Date().toISOString(),
      performedAt: new Date().toISOString(),
      createdBy: user.id,
      performedBy: user.id,
    });
  }

  await writeAuditLog({
    action: "sccg-card.issued",
    actorId: user.id,
    actorEmail: user.email,
    targetId: card.id,
    targetType: "sccg-card",
    after: { cardNumber: card.cardNumber, clientName: data.clientName, tier: data.tier, balance: data.initialBalance },
  });

  return card;
}

export async function loadCard(cardId: string, amount: number, description: string) {
  const user = await requirePermission("sccg-card.manage");
  const card = await getSccgCardById(cardId);
  if (!card) throw new Error("Card not found");
  if (card.status !== "active") throw new Error("Card is not active");

  const newBalance = card.balance + amount;
  await updateSccgCard(cardId, { balance: newBalance });

  await createSccgCardTransaction({
    sccgCardId: cardId,
    cardId,
    transactionType: "top-up",
    type: "load",
    amount,
    currency: card.currency,
    runningBalance: newBalance,
    balanceAfter: newBalance,
    description,
    createdAt: new Date().toISOString(),
    performedAt: new Date().toISOString(),
    createdBy: user.id,
    performedBy: user.id,
  });

  await writeAuditLog({
    action: "sccg-card.loaded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cardId,
    targetType: "sccg-card",
    after: { amount, newBalance },
  });

  return newBalance;
}

export async function redeemCard(cardId: string, amount: number, description: string, referenceId?: string) {
  const user = await requirePermission("sccg-card.manage");
  const card = await getSccgCardById(cardId);
  if (!card) throw new Error("Card not found");
  if (card.status !== "active") throw new Error("Card is not active");
  if (card.balance < amount) throw new Error("Insufficient balance");

  const newBalance = card.balance - amount;
  await updateSccgCard(cardId, { balance: newBalance });

  await createSccgCardTransaction({
    sccgCardId: cardId,
    cardId,
    transactionType: "purchase-usage",
    type: "redeem",
    amount: -amount,
    currency: card.currency,
    runningBalance: newBalance,
    balanceAfter: newBalance,
    description,
    referenceId,
    createdAt: new Date().toISOString(),
    performedAt: new Date().toISOString(),
    createdBy: user.id,
    performedBy: user.id,
  });

  await writeAuditLog({
    action: "sccg-card.redeemed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cardId,
    targetType: "sccg-card",
    after: { amount, newBalance, referenceId },
  });

  return newBalance;
}

export async function suspendCard(cardId: string, reason: string) {
  const user = await requirePermission("sccg-card.manage");
  await updateSccgCard(cardId, { status: "frozen" });

  await writeAuditLog({
    action: "sccg-card.suspended",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cardId,
    targetType: "sccg-card",
    metadata: { reason },
  });
}

export async function reactivateCard(cardId: string) {
  const user = await requirePermission("sccg-card.manage");
  await updateSccgCard(cardId, { status: "active" });

  await writeAuditLog({
    action: "sccg-card.reactivated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cardId,
    targetType: "sccg-card",
  });
}

export async function removeSccgCard(cardId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requirePermission("sccg-card.manage");
    await deleteSccgCard(cardId);
    await writeAuditLog({ action: "sccg-card.deleted", actorId: user.id, actorEmail: user.email, targetId: cardId, targetType: "sccg-card" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function holdSccgCard(cardId: string, freeze: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requirePermission("sccg-card.manage");
    await updateSccgCard(cardId, { status: freeze ? "frozen" : "active" });
    await writeAuditLog({ action: freeze ? "sccg-card.frozen" : "sccg-card.unfrozen", actorId: user.id, actorEmail: user.email, targetId: cardId, targetType: "sccg-card" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
