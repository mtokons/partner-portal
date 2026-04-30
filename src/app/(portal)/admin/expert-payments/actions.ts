"use server";

import { redirect } from "next/navigation";
import { approveExpertPayment } from "@/lib/sharepoint";
import { assertAdmin } from "@/lib/admin-guard";

export async function approvePaymentAction(paymentId: string) {
  const admin = await assertAdmin();
  await approveExpertPayment(paymentId, admin.id);
  redirect("/admin/expert-payments");
}
