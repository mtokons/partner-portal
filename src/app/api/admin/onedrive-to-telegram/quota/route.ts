import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";

    const client = await getGraphClient();
    const driveApi = userId ? `/users/${userId}/drive` : "/me/drive";
    const drive = await client.api(driveApi).select("quota,id,name,driveType").get();

    return NextResponse.json({
      success: true,
      quota: drive.quota,
      driveType: drive.driveType,
      name: drive.name,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch OneDrive quota." },
      { status: 500 }
    );
  }
}
