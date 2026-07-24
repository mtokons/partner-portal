import { NextResponse } from "next/server";
import { startTransferJob } from "@/lib/telegram-transfer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { botToken, chatId, folderPath, userId } = body;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Bot Token and Target Chat ID are required." },
        { status: 400 }
      );
    }

    await startTransferJob({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      folderPath: folderPath ? folderPath.trim() : "/",
      userId: userId ? userId.trim() : undefined,
    });

    return NextResponse.json({ success: true, message: "Transfer job started." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start transfer job." },
      { status: 500 }
    );
  }
}
