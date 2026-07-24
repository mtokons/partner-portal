"use server";

import { markInstallmentPaid, createActivity } from "@/lib/sharepoint";
import { triggerFlow } from "@/lib/powerautomate";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";

export async function markInstallmentPaidAction(installmentId: string) {
  const session = await getEffectiveSession();
  if (!session?.user) return;
  const user = session.user as SessionUser;

  const paidDate = new Date().toISOString().slice(0, 10);
  await markInstallmentPaid(installmentId, paidDate);

  await createActivity({
    partnerId: user.partnerId,
    type: "payment",
    description: `Installment ${installmentId} marked as paid`,
    relatedId: installmentId,
    createdAt: new Date().toISOString(),
  });

  await triggerFlow("payment-confirmed", {
    installmentId,
    partnerId: user.partnerId,
    paidDate,
  });
}
