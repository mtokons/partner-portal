"use server";

import { revalidatePath } from "next/cache";
import { updatePartnerStatus, updatePartnerTierAndMargin, updatePartnerSalesTarget, getPartners } from "@/lib/sharepoint";
import type { PartnerStatus, TierStatus, PartnerMargin } from "@/types";
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

export async function updatePartnerTierAndMarginAction(
  id: string,
  tierStatus: TierStatus,
  marginPercentage: PartnerMargin
) {
  try {
    await assertAdmin();
    // 1. Update in SharePoint
    await updatePartnerTierAndMargin(id, tierStatus, marginPercentage);

    // 2. Sync to Firestore if there is a matching user record by email
    const partners = await getPartners();
    const partner = partners.find((p) => p.id === id);
    if (partner?.email) {
      const { getAdminFirestore } = await import("@/lib/firebase-admin");
      const db = getAdminFirestore();
      const userQuery = await db.collection("users").where("email", "==", partner.email).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          tierStatus,
          marginPercentage,
          updatedAt: new Date(),
        });
      }
    }

    revalidatePath("/admin/partners");
    return { success: true };
  } catch (error: any) {
    console.error("Update partner tier/margin error:", error);
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

export async function updatePartnerSalesTargetAction(id: string, salesTarget: number) {
  try {
    await assertAdmin();
    await updatePartnerSalesTarget(id, salesTarget);
    revalidatePath("/admin/partners");
    revalidatePath("/partner/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Update partner sales target error:", error);
    return { success: false, error: error.message };
  }
}
