"use server";

import { auth } from "@/auth";
import type { SessionUser, CommissionLedgerEntry } from "@/types";
import { createCommissionLedgerEntry } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function adjustCommissionAction(data: {
  recipientId: string;
  recipientName: string;
  recipientType: string;
  amount: number;
  description: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) throw new Error("Admin only");

  await createCommissionLedgerEntry({
    entryType: "commission-adjustment",
    recipientId: data.recipientId,
    recipientName: data.recipientName,
    recipientType: data.recipientType,
    amount: data.amount,
    currency: "BDT",
    runningBalance: 0, // Calculated on retrieval in sharepoint.ts mock usually
    description: data.description,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  });

  revalidatePath("/admin/commissions");
  return { success: true };
}
