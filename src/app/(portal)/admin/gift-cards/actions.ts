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
    cardNumber: generateGiftCardNumber(),
    issuedToUserId: data.issuedToUserId,
    issuedToName: data.issuedToName,
    issuedToEmail: data.issuedToEmail,
    issuedByUserId: user.id,
    initialBalance: data.initialBalance,
    currentBalance: data.initialBalance,
    currency: "BDT",
    status: "active",
    designTemplate: data.designTemplate,
    activatedAt: new Date().toISOString(),
    expiresAt: data.expiresAt,
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
