"use server";

import { assertAdmin } from "@/lib/admin-guard";
import { createProduct, getProducts } from "@/lib/sharepoint";
import { writeAuditLog } from "@/lib/audit-log";

const MAX_SIZE = 10 * 1024 * 1024;

export async function getMarketingMaterialsAction() {
  await assertAdmin();
  const products = await getProducts();
  return products.filter((product) => product.category === "marketing-materials" && product.isAvailable);
}

export async function uploadMarketingMaterialAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await assertAdmin();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    if (!file || !title) return { success: false, error: "Title and file are required." };
    if (file.size > MAX_SIZE) return { success: false, error: "Files must be 10 MB or smaller." };
    const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "bin" : "bin";
    const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "material"}_${Date.now()}.${ext}`;
    const { uploadDriveFile } = await import("@/lib/graph");
    const uploaded = await uploadDriveFile(`MarketingMaterials/${filename}`, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
    const url = uploaded["@microsoft.graph.downloadUrl"] || "";
    await createProduct({ sku: `MKT-${Date.now()}`, name: title, description, unit: "Package", sessionsCount: 0, retailPriceEur: 0, retailPriceBdt: 0, initialPayment: 0, price: 0, stock: 9999, category: "marketing-materials", imageUrl: url, isAvailable: true, tags: ["marketing", `ext:${ext}`], sortOrder: 999 });
    await writeAuditLog({ action: "marketing_material.create", actorId: user.id, actorEmail: user.email, targetId: filename, targetType: "marketingMaterial", metadata: { title, fileName: file.name } });
    return { success: true };
  } catch (err: any) { return { success: false, error: err.message || "Upload failed." }; }
}