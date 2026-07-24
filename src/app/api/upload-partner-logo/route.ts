import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { getPartnerByEmail } from "@/lib/sharepoint";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const ALLOWED_EXT_LABEL = "PNG, JPG, WEBP or SVG";

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
    return NextResponse.json({ error: `File exceeds 2 MB limit` }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_EXT_LABEL} files are allowed` },
      { status: 400 }
    );
  }

  try {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 403 });

    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    // Sanitize partner name for use as folder/file name
    const safeName = (partner.companyName || partner.name || user.email!)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const ext = file.type === "image/svg+xml" ? "svg"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/png" ? "png"
      : "jpg";
    const fileName = `${safeName}_logo.${ext}`;
    const uploadPath = `PartnerLogos/${fileName}`;

    const buffer = await file.arrayBuffer();

    // Upload to SharePoint document library
    const uploadRes = await client
      .api(`/sites/${siteId}/drive/root:/${uploadPath}:/content`)
      .header("Content-Type", file.type)
      .put(buffer);

    // Use the direct download URL so it works in emails/PDFs (no auth needed)
    const logoUrl: string =
      uploadRes?.["@microsoft.graph.downloadUrl"] ||
      uploadRes?.webUrl ||
      "";

    if (!logoUrl) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    // Persist the new logoUrl on the partner record via graphPatch
    const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    await graphPatch(
      `${await getSiteListUrlAsync("Partners")}/${partner.id}/fields`,
      { LogoUrl: logoUrl }
    );

    return NextResponse.json({ logoUrl });
  } catch (err) {
    console.error("upload-partner-logo error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
