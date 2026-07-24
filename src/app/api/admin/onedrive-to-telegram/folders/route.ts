import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

interface DriveItem {
  id: string;
  name: string;
  folder?: Record<string, unknown>;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const folderPath = searchParams.get("folderPath") || "/";

    const client = await getGraphClient();
    const cleanPath = folderPath.trim().replace(/^\/+|\/+$/g, "");

    let endpoint = "";
    if (userId) {
      endpoint = cleanPath
        ? `/users/${userId}/drive/root:/${cleanPath}:/children`
        : `/users/${userId}/drive/root/children`;
    } else {
      endpoint = cleanPath
        ? `/me/drive/root:/${cleanPath}:/children`
        : `/me/drive/root/children`;
    }

    // Filter only folder items
    endpoint += `?$filter=folder ne null&$select=id,name,folder&$top=200`;

    const res = await client.api(endpoint).get();
    const items: DriveItem[] = res.value || [];

    const folders = items.map((item) => ({
      id: item.id,
      name: item.name,
      path: cleanPath ? `/${cleanPath}/${item.name}` : `/${item.name}`,
    }));

    return NextResponse.json({
      currentPath: cleanPath ? `/${cleanPath}` : "/",
      folders,
    });
  } catch (err: any) {
    console.error("Failed to fetch OneDrive folders:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch OneDrive folders." },
      { status: 500 }
    );
  }
}
