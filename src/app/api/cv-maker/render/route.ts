import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cv-maker/render
 * Forwards {markdown, template_id} to cv-tailor /cv-maker/render.
 * Returns styled HTML for iframe preview.
 */

const TAILOR_API = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${TAILOR_API}/cv-maker/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Render failed" }));
      return NextResponse.json(
        { error: errorData.detail || "Failed to render template" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("CV Maker render error:", error);
    return NextResponse.json(
      { error: "Failed to connect to rendering service" },
      { status: 500 }
    );
  }
}
