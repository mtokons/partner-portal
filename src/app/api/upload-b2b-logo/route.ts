import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXT_LABEL = "PNG, JPG or WEBP";

/**
 * POST /api/upload-b2b-logo
 * Uploads a B2B (indirect partner) company logo to SharePoint PartnerLogos/b2b/
 * and returns the public download URL.
 * Any authenticated partner or admin can call this.
 */
export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 2 MB limit" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_EXT_LABEL} files are allowed` },
      { status: 400 }
    );
  }

  try {
    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    // Use timestamp to avoid collisions between companies with similar names
    const safeName = (file.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)) || "logo";
    const fileName = `b2b_${safeName}_${Date.now()}.${ext}`;
    const uploadPath = `PartnerLogos/b2b/${fileName}`;

    const buffer = await file.arrayBuffer();

    const uploadRes = await client
      .api(`/sites/${siteId}/drive/root:/${uploadPath}:/content`)
      .header("Content-Type", file.type)
      .put(buffer);

    const logoUrl: string =
      uploadRes?.["@microsoft.graph.downloadUrl"] ||
      uploadRes?.webUrl ||
      "";

    if (!logoUrl) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    return NextResponse.json({ logoUrl });
  } catch (err) {
    console.error("upload-b2b-logo error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
