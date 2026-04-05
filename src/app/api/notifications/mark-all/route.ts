import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/sharepoint";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body || {};
    if (!userId) return NextResponse.json({ success: false, error: "missing userId" }, { status: 400 });
    await markAllNotificationsRead(userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message || String(err) }, { status: 500 });
  }
}
