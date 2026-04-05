import { NextResponse } from "next/server";
import { getClients } from "@/lib/sharepoint";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") || undefined;
  const clients = await getClients(partnerId);
  return NextResponse.json(clients.map((c) => ({ id: c.id, name: c.name, company: c.company })));
}
