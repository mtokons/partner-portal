import { NextResponse } from "next/server";
import { getCandidateDocumentsAction } from "@/app/partner/candidates/actions";
import { requireSessionUser } from "@/lib/api-auth";
import { getCandidateById } from "@/lib/sharepoint";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const candidateId = id;
  try {
    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const res = await getCandidateDocumentsAction(candidateId, candidate.fullName);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to load docs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: res.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
