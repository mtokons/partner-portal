import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { getAllManagedUsers } from "@/lib/admin-users";
import {
  getDhakaToday,
  getWeekDaysForAnchor,
  checkColleagueEditPermission,
} from "@/lib/availability";
import {
  getAvailabilityForRange,
  saveAvailabilityEntry,
} from "@/lib/availability-server";
import { AVAILABILITY_CONFIG } from "@/lib/availability-config";
import type { AvailabilityStatus } from "@/types";

import { resolveCategory } from "@/lib/role-options";

export const dynamic = "force-dynamic";

function isUserAuthorizedManager(roles: string[] = []): boolean {
  const normalized = roles.map((r) => r.toLowerCase().trim());
  return normalized.some((r) =>
    AVAILABILITY_CONFIG.managerRoles.map((m) => m.toLowerCase()).includes(r)
  );
}

export async function GET(request: Request) {
  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const todayDhaka = getDhakaToday();

    // Default to the week of today
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      const currentWeek = getWeekDaysForAnchor(todayDhaka);
      startDate = currentWeek[0].dateStr; // Sunday
      endDate = currentWeek[6].dateStr;   // Saturday
    }

    const userRoles = (user.roles || [user.role]).map((r) => r.toLowerCase().trim());
    const isManager = isUserAuthorizedManager(userRoles);
    const isAdmin = userRoles.some((r) => ["admin", "super_admin", "sccg-admin"].includes(r));

    // Fetch availability records in range and global hidden members
    const [records, hiddenMemberIds] = await Promise.all([
      getAvailabilityForRange(startDate, endDate),
      getHiddenAvailabilityMemberIds().catch(() => [] as string[]),
    ]);

    // Fetch managed colleagues list & filter strictly for SCCG user categories (sccg-admin and sccg-staff)
    let managedUsers = await getAllManagedUsers().catch(() => []);
    let colleagues = managedUsers
      .filter((u) => {
        if (u.status === "suspended") return false;
        const cat = resolveCategory(u.category, u.primaryRole);
        return cat === "sccg-admin" || cat === "sccg-staff";
      })
      .map((u) => {
        const cat = resolveCategory(u.category, u.primaryRole);
        return {
          id: u.id,
          email: u.email,
          displayName: u.displayName || u.email.split("@")[0],
          department: cat === "sccg-admin" ? "SCCG Admin" : (u.company || "SCCG Staff"),
          roles: u.roles || [],
          category: cat,
        };
      });

    // If viewer is not an admin, filter out globally hidden members so they are hidden for everyone
    if (!isAdmin) {
      colleagues = colleagues.filter((c) => !hiddenMemberIds.includes(c.id));
    }

    return NextResponse.json({
      success: true,
      currentDhakaToday: todayDhaka,
      isManager,
      isAdmin,
      startDate,
      endDate,
      records,
      colleagues,
      hiddenMemberIds,
    });
  } catch (err: any) {
    console.error("[GET /api/availability] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load availability" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await reqBodySafe(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      userId,
      userName,
      userEmail,
      department,
      date,
      status,
      startTime,
      endTime,
      slots,
      note,
      isOverride,
      overrideReason,
    } = body;

    if (!userId || !date || !status) {
      return NextResponse.json({ error: "userId, date, and status are required." }, { status: 400 });
    }

    const userRoles = (user.roles || [user.role]).filter(Boolean) as string[];
    const isManager = isUserAuthorizedManager(userRoles);

    // Check if user is editing someone else's entry
    const isSelf =
      user.id === userId ||
      user.email.toLowerCase() === (userEmail || "").toLowerCase();

    let isManagerOverride = Boolean(isOverride);

    if (!isSelf) {
      if (!isManager) {
        return NextResponse.json(
          { error: "Forbidden: You may only modify your own availability." },
          { status: 403 }
        );
      }
      isManagerOverride = true;
    }

    // If it's a manager override, they can bypass cutoff and window rules.
    // Otherwise, enforce colleague window and cutoff rules strictly.
    if (!isManagerOverride) {
      const perm = checkColleagueEditPermission(date);
      if (!perm.allowed) {
        return NextResponse.json({ error: perm.reason }, { status: 403 });
      }
    }

    const result = await saveAvailabilityEntry(
      {
        userId,
        userName: userName || user.name || user.email.split("@")[0],
        userEmail: userEmail || user.email,
        department,
        date,
        status: status as AvailabilityStatus,
        startTime: status === "leave" ? undefined : (startTime || "09:00"),
        endTime: status === "leave" ? undefined : (endTime || "17:00"),
        slots: status === "leave" ? undefined : slots,
        note,
      },
      {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        roles: userRoles,
      },
      isManagerOverride,
      overrideReason
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, record: result.record });
  } catch (err: any) {
    console.error("[POST /api/availability] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save availability" }, { status: 500 });
  }
}

async function reqBodySafe(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
