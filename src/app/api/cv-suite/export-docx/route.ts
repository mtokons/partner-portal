import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { generateCvDocx } from "@/lib/engine/cv-studio-docx";
import type { CvData } from "@/types/cv-builder";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let cvData: CvData;
  try {
    cvData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const docxBlob = await generateCvDocx(cvData);
    const buffer = Buffer.from(await docxBlob.arrayBuffer());

    const safeName = (cvData.personalInfo?.fullName || "Candidate")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="CV_${safeName}.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX generation API failed:", err);
    return NextResponse.json({ error: "Failed to generate DOCX" }, { status: 500 });
  }
}
