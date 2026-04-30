import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/sharepoint";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await markAllNotificationsRead(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message || String(err) }, { status: 500 });
  }
}
