"use server";

import { updatePartnerStatus } from "@/lib/sharepoint";
import { triggerFlow } from "@/lib/powerautomate";
import { auth } from "@/auth";
import type { SessionUser, PartnerStatus } from "@/types";

export async function updatePartnerStatusAction(partnerId: string, status: PartnerStatus) {
  const session = await auth();
  if (!session?.user) return;
  const user = session.user as SessionUser;
  if (user.role !== "admin") return;

  await updatePartnerStatus(partnerId, status);

  await triggerFlow("partner-status-changed", {
    partnerId,
    newStatus: status,
    changedBy: user.email,
  });
}
