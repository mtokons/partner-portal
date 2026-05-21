import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const candidateId = formData.get("candidateId") as string | null;
  const documentType = formData.get("documentType") as string | null;
  const file = formData.get("file") as File | null;

  if (!documentType || !file) {
    return NextResponse.json({ error: "documentType and file are required" }, { status: 400 });
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
  }

  const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPG, PNG allowed" }, { status: 400 });
  }

  try {
    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    const sanitizedType = documentType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = file.name.split(".").pop() ?? "bin";
    const fileName = candidateId
      ? `${candidateId}_${sanitizedType}_${Date.now()}.${ext}`
      : `${sanitizedType}_${Date.now()}.${ext}`;

    const folderPath = candidateId ? `CandidateDocs/${candidateId}` : "CandidateDocs";
    const uploadUrl = `/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/content`;

    const buffer = await file.arrayBuffer();
    const uploadRes = await client
      .api(uploadUrl)
      .header("Content-Type", file.type)
      .put(buffer);

    const fileUrl: string = uploadRes?.webUrl ?? uploadUrl;

    return NextResponse.json({ fileUrl, fileName });
  } catch (err) {
    console.error("upload-candidate-doc:", (err as Error).message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
