import { NextResponse } from "next/server";
import { sendUserAuthCode, verifyUserAuthCode, startTransferJob } from "@/lib/telegram-transfer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, mode, botToken, apiId, apiHash, phoneNumber, phoneCodeHash, code, password, sessionString, chatId, folderPath, userId, deleteAfterTransfer } = body;

    // 1. Send SMS/App Auth Code for MTProto User API
    if (action === "send_code") {
      if (!apiId || !apiHash || !phoneNumber) {
        return NextResponse.json({ error: "apiId, apiHash, and phoneNumber are required." }, { status: 400 });
      }
      const res = await sendUserAuthCode(Number(apiId), apiHash.trim(), phoneNumber.trim());
      return NextResponse.json({ success: true, phoneCodeHash: res.phoneCodeHash });
    }

    // 2. Verify Code & Generate MTProto StringSession
    if (action === "verify_code") {
      if (!apiId || !apiHash || !phoneNumber || !phoneCodeHash || !code) {
        return NextResponse.json({ error: "apiId, apiHash, phoneNumber, phoneCodeHash, and code are required." }, { status: 400 });
      }
      const res = await verifyUserAuthCode(Number(apiId), apiHash.trim(), phoneNumber.trim(), phoneCodeHash, code.trim(), password);
      return NextResponse.json({ success: true, sessionString: res.sessionString });
    }

    // 3. Start Transfer Job
    if (!chatId) {
      return NextResponse.json({ error: "Target Chat ID is required." }, { status: 400 });
    }

    await startTransferJob({
      mode: mode || "bot",
      botToken: botToken ? botToken.trim() : undefined,
      apiId: apiId ? Number(apiId) : undefined,
      apiHash: apiHash ? apiHash.trim() : undefined,
      sessionString: sessionString ? sessionString.trim() : undefined,
      chatId: chatId.trim(),
      folderPath: folderPath ? folderPath.trim() : "/",
      userId: userId ? userId.trim() : undefined,
      deleteAfterTransfer: !!deleteAfterTransfer,
    });

    return NextResponse.json({ success: true, message: "Transfer job started." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process transfer request." },
      { status: 500 }
    );
  }
}
