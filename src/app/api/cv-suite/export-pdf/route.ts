import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { generateCvStudioPdf } from "@/lib/engine/cv-studio-pdf";
import type { CvData } from "@/types/cv-builder";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let cvData: CvData;
  try {
    cvData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const pdfBytes = generateCvStudioPdf(cvData);

    const safeName = (cvData.personalInfo?.fullName || "Candidate")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CV_${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation API error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
