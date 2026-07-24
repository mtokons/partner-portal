import { NextRequest, NextResponse } from "next/server";

// Proxies to the Model Test Learning System FastAPI service (see model-test-system/).
const MODEL_TEST_API = process.env.MODEL_TEST_API_URL || "http://model-test:8002";

async function forward(
  req: NextRequest,
  path: string[],
  method: "GET" | "POST" | "PUT",
): Promise<NextResponse> {
  const endpoint = `/${path.join("/")}`;
  const url = `${MODEL_TEST_API}${endpoint}${method === "GET" ? req.nextUrl.search : ""}`;

  try {
    const init: RequestInit = {
      method,
      headers: { accept: "application/json" },
    };

    if (method !== "GET") {
      const contentType = req.headers.get("content-type") || "application/json";
      (init.headers as Record<string, string>)["Content-Type"] = contentType;
      init.body = await req.text();
    }

    const upstream = await fetch(url, init);
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "Model Test service unavailable" },
      { status: 503 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path, "POST");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(req, path, "PUT");
}
