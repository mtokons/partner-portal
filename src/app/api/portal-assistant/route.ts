import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPortalAssistantReply, type ChatMessage } from "@/lib/ai-chat";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];
  const message = typeof body?.message === "string" ? body.message : "";

  if (!message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const result = await getPortalAssistantReply(history, message);
  return NextResponse.json(result);
}
