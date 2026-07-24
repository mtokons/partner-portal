import { NextResponse } from "next/server";
import { stopTransferJob } from "@/lib/telegram-transfer";

export async function POST() {
  stopTransferJob();
  return NextResponse.json({ success: true, message: "Stop signal sent." });
}
