import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { submitChangeRequest } from "@/lib/availability-server";
import type { AvailabilityStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getEffectiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, requestedStatus, requestedTime, reason } = body;

    if (!date || !requestedStatus || !reason) {
      return NextResponse.json(
        { error: "Date, requestedStatus, and reason are required for change requests." },
        { status: 400 }
      );
    }

    const result = await submitChangeRequest({
      userId: user.id,
      userName: user.name || user.email.split("@")[0],
      userEmail: user.email,
      date,
      requestedStatus: requestedStatus as AvailabilityStatus,
      requestedTime,
      reason,
      actor: {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Change request submitted to management." });
  } catch (err: any) {
    console.error("[POST /api/availability/request-change] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit request" }, { status: 500 });
  }
}
