"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { approveExpertPayment } from "@/lib/sharepoint";

export async function approvePaymentAction(paymentId: string, adminId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");

  await approveExpertPayment(paymentId, adminId);
  redirect("/admin/expert-payments");
}
