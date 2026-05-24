"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";
import { revalidatePath } from "next/cache";

export async function updatePartnerProfile(data: {
  phone?: string;
  company?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (!user.partnerId) throw new Error("Not a partner");

  const partner = await getPartnerByEmail(user.email!);
  if (!partner) throw new Error("Partner not found");

  // Use graphPatch directly since no generic update exists
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const fields: Record<string, string | undefined> = {};
  if (data.phone !== undefined) fields["Phone"] = data.phone;
  if (data.company !== undefined) fields["Company"] = data.company;

  if (Object.keys(fields).length > 0) {
    await graphPatch(`${await getSiteListUrlAsync("Partners")}/${partner.id}/fields`, fields);
  }

  revalidatePath("/partner/settings");
  return { success: true };
}
