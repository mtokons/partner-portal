"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { createTransaction } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function submitRefundRequest(data: {
  candidateId: string;
  candidateName: string;
  amount: number;
  reason: string;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not a partner");

  const now = new Date().toISOString();

  await createTransaction({
    clientId: data.candidateId,
    partnerId: user.partnerId,
    type: "refund-request",
    amount: data.amount,
    reference: `REFUND-${Date.now()}`,
    description: `Refund request for ${data.candidateName}: ${data.reason}`,
    date: now,
  });

  revalidatePath("/partner/finance/refunds");
  return { success: true };
}
