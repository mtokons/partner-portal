import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cv-maker/export
 * Forwards {markdown, template_id, format} to cv-tailor /cv-maker/export.
 * Streams the resulting PDF or DOCX binary file.
 */

const TAILOR_API = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${TAILOR_API}/cv-maker/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Export failed" }));
      return NextResponse.json(
        { error: errorData.detail || "Failed to export" },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const disposition = res.headers.get("content-disposition") || "";

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
    });
  } catch (error) {
    console.error("CV Maker export error:", error);
    return NextResponse.json(
      { error: "Failed to connect to export service" },
      { status: 500 }
    );
  }
}
