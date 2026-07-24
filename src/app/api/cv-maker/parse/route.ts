import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cv-maker/parse
 * Forwards file upload to cv-tailor /cv-maker/parse endpoint.
 * Returns extracted Markdown from the uploaded CV.
 */

const TAILOR_API = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${TAILOR_API}/cv-maker/parse`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Parse failed" }));
      return NextResponse.json(
        { error: errorData.detail || "Failed to parse file" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("CV Maker parse error:", error);
    return NextResponse.json(
      { error: "Failed to connect to parsing service" },
      { status: 500 }
    );
  }
}
