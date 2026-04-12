"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { createGiftCard, updateGiftCard, generateGiftCardNumber } from "@/lib/sharepoint";

export async function issueGiftCardAction(data: {
  issuedToUserId: string;
  issuedToName: string;
  issuedToEmail: string;
  initialBalance: number;
  designTemplate: "standard" | "premium" | "birthday" | "corporate";
  expiresAt: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  const card = await createGiftCard({
    sccgId: `SCCG-ID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    cardNumber: generateGiftCardNumber(),
    pinHash: "placeholder",
    pinAttempts: 0,
    issuedToUserId: data.issuedToUserId,
    issuedToName: data.issuedToName,
    issuedToEmail: data.issuedToEmail,
    issuedByUserId: user.id,
    issuedBy: user.name,
    initialBalance: data.initialBalance,
    currentBalance: data.initialBalance,
    balance: data.initialBalance,
    currency: "BDT",
    tier: "standard",
    status: "active",
    designTemplate: data.designTemplate,
    notes: "",
    activatedAt: new Date().toISOString(),
    expiresAt: data.expiresAt,
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return { success: true, card };
}

export async function freezeGiftCardAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await updateGiftCard(id, { status: "frozen" });
  return { success: true };
}

export async function activateGiftCardAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await updateGiftCard(id, { status: "active" });
  return { success: true };
}
