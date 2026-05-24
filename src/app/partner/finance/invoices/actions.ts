"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, createInvoice } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function createPartnerInvoice(data: {
  clientName: string;
  amount: number;
  description?: string;
  dueDate: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Not a partner");

  if (!data.clientName?.trim()) throw new Error("Client name is required");
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than 0");
  if (!data.dueDate) throw new Error("Due date is required");

  await createInvoice({
    partnerId: partner.id,
    clientId: "",
    clientName: data.clientName.trim(),
    amount: data.amount,
    status: "draft",
    dueDate: data.dueDate,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/partner/finance/invoices");
  return { success: true, invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}` };
}
