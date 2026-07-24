"use server";

import { revalidatePath } from "next/cache";
import { getPartnerById } from "@/lib/sharepoint";
import { assertAdmin } from "@/lib/admin-guard";
import type { TierStatus, PartnerMargin, PartnerType } from "@/types";

export async function getPartnerForEditAction(id: string) {
  await assertAdmin();
  const partner = await getPartnerById(id);
  if (!partner) throw new Error("Partner not found");
  return partner;
}

export interface PartnerEditInput {
  name: string;
  email: string;
  company: string;
  phone: string;
  partnerType: PartnerType;
  tierStatus: TierStatus;
  marginPercentage: PartnerMargin;
  status: "active" | "pending" | "suspended";
  preferredCurrency: string;
  salesTarget?: number;
}

export async function savePartnerAction(id: string, input: PartnerEditInput) {
  try {
    await assertAdmin();

    if (!input.name?.trim() || !input.email?.trim()) {
      return { success: false, error: "Name and email are required" };
    }

    // Call Graph API directly — avoids runSafe silently swallowing errors
    const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const base = await getSiteListUrlAsync("Partners");

    const fields: Record<string, unknown> = {
      Title:             input.name.trim(),
      Email:             input.email.trim(),
      Company:           input.company || "",
      Phone:             input.phone || "",
      PartnerType:       input.partnerType || "individual",
      TierStatus:        input.tierStatus || "Silver",
      MarginPercentage:  Number(input.marginPercentage) || 8,
      Status:            input.status || "active",
    };
    if (input.salesTarget !== undefined && input.salesTarget !== null) {
      fields.SalesTarget = Number(input.salesTarget);
    }

    await graphPatch(`${base}/${id}/fields`, fields);

    // Sync to Firestore (non-fatal)
    try {
      const { getAdminFirestore } = await import("@/lib/firebase-admin");
      const db = getAdminFirestore();
      const q = await db.collection("users").where("email", "==", input.email.trim()).get();
      if (!q.empty) {
        await q.docs[0].ref.update({
          tierStatus: input.tierStatus,
          marginPercentage: Number(input.marginPercentage),
          company: input.company,
          phone: input.phone,
          displayName: input.name.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch { /* non-fatal */ }

    revalidatePath("/admin/partners");
    return { success: true };
  } catch (err: any) {
    console.error("savePartnerAction error:", err);
    return { success: false, error: err?.message || "Failed to save partner" };
  }
}
