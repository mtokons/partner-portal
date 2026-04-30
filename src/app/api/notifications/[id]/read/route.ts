import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotificationById, markNotificationRead } from "@/lib/sharepoint";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const notif = await getNotificationById(id);
    // Ownership check: only the recipient may mark as read.
    if (!notif || notif.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await markNotificationRead(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
