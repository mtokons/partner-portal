import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProjectById, canAccessProject, getDriveDocPath } from "@/lib/projects";
import { getDriveFile } from "@/lib/graph";

const ALLOWED_FOLDERS = ["CVs", "Proposals", "Documents", "Matrix"];

/**
 * GET /api/project-files/{projectId}/{folder}/{file}
 * Streams a project document. Access is restricted to admins and the project's
 * assigned project partner. Read-only — never personal contact info.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; folder: string; file: string }> }
) {
  const { projectId, folder, file } = await params;

  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  const isAdmin = roles.some((r) => {
    const l = r.toLowerCase();
    return l === "admin" || l === "project-admin" || l === "project admin";
  });
  const isProjectPartner = roles.some((r) => {
    const l = r.toLowerCase();
    return l === "project-partner" || l === "project-partner-admin";
  });
  if (!isAdmin && !isProjectPartner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await getProjectById(projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin) {
    let allowed = project.partnerEmail === user.email.toLowerCase();
    if (!allowed && project.orgId) {
      const { getOrgIdForUserEmail } = await import("@/lib/ppms-users");
      const userOrgId = await getOrgIdForUserEmail(user.email);
      if (userOrgId) {
        const allowedOrgs = project.orgId.split(",").map((id) => id.trim());
        if (allowedOrgs.includes(userOrgId)) {
          allowed = true;
        }
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const fileName = decodeURIComponent(file);
  const result = await getDriveFile(getDriveDocPath(projectId, folder, fileName));
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // In-portal HTML preview for Word documents (docx can't be shown natively in a browser).
  if (req.nextUrl.searchParams.get("preview") === "html" && /\.docx?$/i.test(fileName)) {
    try {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.convertToHtml({ buffer: result.buffer });
      // Basic hardening: drop any script tags / inline event handlers from converted markup.
      const safe = value
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/ on[a-z]+="[^"]*"/gi, "");
      return new NextResponse(safe, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
      });
    } catch {
      return NextResponse.json({ error: "Preview unavailable" }, { status: 422 });
    }
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `${disposition}; filename="${result.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
