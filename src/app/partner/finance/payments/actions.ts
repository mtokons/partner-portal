"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { createTransaction, getPartnerByEmail } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function recordPayment(data: {
  amount: number;
  reference: string;
  method: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not a partner");

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Partner not found");

  const now = new Date().toISOString();

  await createTransaction({
    clientId: "",
    partnerId: user.partnerId,
    type: "payment",
    amount: data.amount,
    reference: data.reference,
    description: `Partner payment via ${data.method}${data.notes ? ` — ${data.notes}` : ""}`,
    date: now,
  });

  revalidatePath("/partner/finance");
  revalidatePath("/partner/finance/payments");
  revalidatePath("/partner/finance/due-payments");
  return { success: true };
}
