import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getBankCvById, getExpertById } from "@/lib/expert-bank";
import { getDriveFile } from "@/lib/graph";
import { getOrgForAdminEmail } from "@/lib/project-orgs";
import { verifySignedCvAccessUrl } from "@/lib/signed-cv-url";

export const dynamic = "force-dynamic";

/**
 * Stream a Master-Bank CV file for viewing/downloading.
 * Access: admin always; a project-partner only if the expert is NOT locked by
 * another partner (so booked experts stay hidden from everyone else).
 * ?download=1 forces an attachment disposition.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ cvId: string }> }) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  const { cvId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const signedUrl = token ? `${req.nextUrl.origin}${req.nextUrl.pathname}?token=${encodeURIComponent(token)}` : "";

  // Verify the request is authenticated either by a valid session or a valid signed token
  const isTokenValid = signedUrl ? verifySignedCvAccessUrl(signedUrl) : false;
  if (!user && !isTokenValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = user ? roles.includes("admin") : false;

  // If session is present but not admin, it must have a valid signed token
  if (user && !isAdmin && !isTokenValid) {
    return NextResponse.json({ error: "Invalid or expired preview link" }, { status: 403 });
  }

  const cv = await getBankCvById(cvId);
  if (!cv) return NextResponse.json({ error: "CV not found" }, { status: 404 });

  // Partner access check if we have a user session and they are not admin
  if (user && !isAdmin) {
    const expert = await getExpertById(cv.expertId);
    if (!expert) return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    if (expert.status === "locked") {
      const org = await getOrgForAdminEmail(user.email).catch(() => null);
      const partnerId = org?.id || "";
      if (expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
        return NextResponse.json({ error: "Expert is booked by another partner" }, { status: 403 });
      }
    }
  }

  const file = await getDriveFile(cv.drivePath);
  if (!file) return NextResponse.json({ error: "File not found in storage" }, { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(cv.fileName)}"`;
  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
