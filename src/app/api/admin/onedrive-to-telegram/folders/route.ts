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
    endpoint += `?$filter=folder ne null&$select=id,name,folder&$top=999`;

    const folders: Array<{ id: string; name: string; path: string }> = [];
    let currentEndpoint: string | null = endpoint;

    while (currentEndpoint) {
      const res: any = await client.api(currentEndpoint).get();
      const items: DriveItem[] = res.value || [];

      for (const item of items) {
        folders.push({
          id: item.id,
          name: item.name,
          path: cleanPath ? `/${cleanPath}/${item.name}` : `/${item.name}`,
        });
      }

      const nextLink: string | undefined = res["@odata.nextLink"];
      if (nextLink) {
        if (nextLink.startsWith("https://graph.microsoft.com/v1.0")) {
          currentEndpoint = nextLink.replace("https://graph.microsoft.com/v1.0", "");
        } else if (nextLink.startsWith("https://graph.microsoft.com/beta")) {
          currentEndpoint = nextLink.replace("https://graph.microsoft.com/beta", "");
        } else {
          currentEndpoint = nextLink;
        }
      } else {
        currentEndpoint = null;
      }
    }

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
