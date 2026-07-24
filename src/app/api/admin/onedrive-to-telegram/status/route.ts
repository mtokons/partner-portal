import { NextResponse } from "next/server";
import { getTransferStatus } from "@/lib/telegram-transfer";

export async function GET() {
  const status = getTransferStatus();
  return NextResponse.json(status);
}
