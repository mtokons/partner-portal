import { NextRequest, NextResponse } from "next/server";

const TAILOR_API = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const endpoint = `/${path.join("/")}`;
  const url = `${TAILOR_API}${endpoint}${req.nextUrl.search}`;
  try {
    const upstream = await fetch(url, { headers: { accept: "application/json" } });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "CV Tailor service unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const endpoint = `/${path.join("/")}`;
  const url = `${TAILOR_API}${endpoint}`;
  const contentType = req.headers.get("content-type") || "application/json";

  try {
    let body: BodyInit;
    if (contentType.includes("multipart/form-data")) {
      // Forward multipart as-is (file uploads)
      const formData = await req.formData();
      body = formData as BodyInit;
    } else {
      body = await req.text();
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: contentType.includes("multipart") ? {} : { "Content-Type": contentType },
      body,
    });

    // DOCX / PDF download — stream binary
    const ct = upstream.headers.get("content-type") || "";
    if (ct.includes("officedocument") || ct.includes("octet-stream") || ct.includes("pdf")) {
      const blob = await upstream.blob();
      const disposition = upstream.headers.get("content-disposition") || 'attachment; filename="output.docx"';
      return new NextResponse(blob.stream(), {
        status: upstream.status,
        headers: { "Content-Type": ct, "Content-Disposition": disposition },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "CV Tailor service unavailable" }, { status: 503 });
  }
}
