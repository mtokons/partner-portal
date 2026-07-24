"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { createProduct } from "@/lib/sharepoint";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadMarketplaceResourceAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();

    const file = formData.get("file") as File | null;
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (!file) return { success: false, error: "Please select a file" };
    if (!name) return { success: false, error: "Please provide a title" };
    if (file.size > MAX_SIZE) return { success: false, error: "File exceeds 10 MB limit" };

    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "bin" : "bin";
    const safeBase = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "resource";
    const fileName = `${safeBase}_${Date.now()}.${ext}`;
    const uploadPath = `PartnerResources/${fileName}`;

    const buffer = await file.arrayBuffer();

    const uploadRes = await client
      .api(`/sites/${siteId}/drive/root:/${uploadPath}:/content`)
      .header("Content-Type", file.type || "application/octet-stream")
      .put(buffer);

    const downloadUrl: string =
      uploadRes?.["@microsoft.graph.downloadUrl"] ||
      uploadRes?.webUrl ||
      "";

    if (!downloadUrl) return { success: false, error: "Upload succeeded but no URL returned" };

    await createProduct({
      sku: `DL-${Date.now()}`,
      name,
      description: description || `Download resource uploaded by admin (${file.name})`,
      unit: "Package",
      sessionsCount: 0,
      retailPriceEur: 0,
      retailPriceBdt: 0,
      initialPayment: 0,
      price: 0,
      stock: 9999,
      category: "partner-downloads",
      imageUrl: downloadUrl,
      isAvailable: true,
      tags: ["resource", `ext:${ext}`],
      sortOrder: 999,
    });

    revalidatePath("/partner/marketplace");
    return { success: true };
  } catch (err) {
    console.error("uploadMarketplaceResourceAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}
