"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { updateCandidate } from "@/lib/sharepoint";

export async function toggleOnHoldAction(
  candidateId: string,
  isOnHold: boolean
): Promise<void> {
  await requirePermission("candidate.status.advance");
  await updateCandidate(candidateId, { isOnHold });
  revalidatePath(`/admin/candidates/${candidateId}`);
  revalidatePath("/admin/candidates");
}
