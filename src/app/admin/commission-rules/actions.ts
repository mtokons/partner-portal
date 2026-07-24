"use server";

import { auth } from "@/auth";
import type { SessionUser, CommissionRule, PromoCodeType, CommissionTier } from "@/types";
import { createCommissionRule, updateCommissionRule, deleteCommissionRule } from "@/lib/sharepoint";

export async function createRuleAction(data: {
  name: string;
  codeType: PromoCodeType;
  partnerTier: CommissionTier | "any";
  productCategory: string;
  commissionPercent: number;
  minOrderAmount: number;
  maxCommission: number;
  priority: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await createCommissionRule({
    ...data,
    isActive: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

export async function toggleRuleAction(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await updateCommissionRule(id, { isActive: active });
  return { success: true };
}

export async function deleteRuleAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await deleteCommissionRule(id);
  return { success: true };
}
