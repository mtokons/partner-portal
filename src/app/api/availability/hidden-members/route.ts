import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { AVAILABILITY_CONFIG } from "@/lib/availability-config";
import {
  getHiddenAvailabilityMemberIds,
  setHiddenAvailabilityMemberIds,
} from "@/lib/availability-server";

export const dynamic = "force-dynamic";

function isUserAuthorizedAdmin(roles: string[] = []): boolean {
  const normalized = roles.map((r) => r.toLowerCase().trim());
  return normalized.some((r) =>
    ["admin", "super_admin", "sccg-admin"].includes(r)
  );
}

export async function GET() {
  try {
    const hiddenMemberIds = await getHiddenAvailabilityMemberIds();
    return NextResponse.json({ success: true, hiddenMemberIds });
  } catch (err: any) {
    console.error("[GET /api/availability/hidden-members] Error:", err);
    return NextResponse.json({ success: false, error: err.message, hiddenMemberIds: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = (user.roles || [user.role]).map((r) => r.toLowerCase().trim());
    const isAdmin = isUserAuthorizedAdmin(userRoles);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can hide or unhide team members." },
        { status: 403 }
      );
    }

    const body = await request.json();
    let updatedHiddenIds: string[] = [];

    if (Array.isArray(body.hiddenMemberIds)) {
      updatedHiddenIds = body.hiddenMemberIds;
    } else if (body.memberId && typeof body.hide === "boolean") {
      const current = await getHiddenAvailabilityMemberIds();
      if (body.hide) {
        updatedHiddenIds = Array.from(new Set([...current, String(body.memberId)]));
      } else {
        updatedHiddenIds = current.filter((id) => id !== String(body.memberId));
      }
    } else {
      return NextResponse.json(
        { error: "Invalid request payload. Expected hiddenMemberIds array or { memberId, hide }." },
        { status: 400 }
      );
    }

    await setHiddenAvailabilityMemberIds(updatedHiddenIds, user.email || user.name || "admin");

    return NextResponse.json({
      success: true,
      hiddenMemberIds: updatedHiddenIds,
      message: "Global team visibility updated successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/availability/hidden-members] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update hidden members" }, { status: 500 });
  }
}
