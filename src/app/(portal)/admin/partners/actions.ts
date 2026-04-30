"use server";

import { revalidatePath } from "next/cache";
import { updatePartnerStatus } from "@/lib/sharepoint";
import type { PartnerStatus } from "@/types";
import { assertAdmin } from "@/lib/admin-guard";

export async function updatePartnerStatusAction(id: string, status: PartnerStatus) {
  try {
    await assertAdmin();
    await updatePartnerStatus(id, status);
    revalidatePath("/admin/partners");
    return { success: true };
  } catch (error: any) {
    console.error("Update partner status error:", error);
    return { success: false, error: error.message };
  }
}

export async function refreshPartnersAction() {
  try {
    await assertAdmin();
    revalidatePath("/admin/partners");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
