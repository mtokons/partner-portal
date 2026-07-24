"use server";

import { auth } from "@/auth";
import type { SessionUser, PromoCodeType, PromoCodeStatus } from "@/types";
import {
  createPromoCode,
  deletePromoCode,
  updatePromoCode,
  generatePromoCodeString,
} from "@/lib/sharepoint";

export async function createPromoCodeAction(data: {
  code?: string;
  codeType: PromoCodeType;
  discountType: "fixed" | "percent" | "none";
  discountValue: number;
  maxUses: number;
  maxUsesPerUser: number;
  minOrderAmount: number;
  validFrom: string;
  validUntil?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  const code = data.code || generatePromoCodeString("SCCG-", 6);

  const promo = await createPromoCode({
    code,
    codeType: data.codeType,
    ownerId: user.id,
    ownerName: user.name,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxUses: data.maxUses,
    currentUses: 0,
    maxUsesPerUser: data.maxUsesPerUser,
    minOrderAmount: data.minOrderAmount,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    status: "active" as PromoCodeStatus,
    shareableLink: `/shop?promo=${code}`,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  });

  return { success: true, promo };
}

export async function deletePromoCodeAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await deletePromoCode(id);
  return { success: true };
}

export async function togglePromoCodeAction(id: string, status: PromoCodeStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await updatePromoCode(id, { status });
  return { success: true };
}
