import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";

// ── Column mapping: App field → SharePoint "SCCG Client" internal field names
// Discovered by querying the live list (fields use auto-generated names like field_2)
const COL = {
  name:          "Title",        // Full name (Required, always "Title" in SP)
  address:       "field_2",      // Residential address
  phone:         "field_3",      // Phone number
  email:         "field_4",      // Email address
  linkedin:      "field_5",      // LinkedIn ID
  degree:        "field_7",      // Most Recent Degree (e.g. Master, Bachelor)
  subject:       "field_8",      // Course/Subject Name
  university:    "field_9",      // University/Institution Name
  gpa:           "field_10",     // Grade (CGPA)
  appType:       "field_14",     // Application Type (Study / Career / etc.)
  paymentStatus: "PaymentStatus",
  salesAmount:   "SalesAmount",
  sessionStatus: "SessionStatus",
} as const;

// ── Helpers ──────────────────────────────────────────────────
async function getGraphToken(): Promise<string> {
  const { ConfidentialClientApplication } = await import("@azure/msal-node");

  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    },
  });

  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result?.accessToken) throw new Error("Failed to acquire Graph token — check AZURE_AD_CLIENT_ID/SECRET/TENANT_ID");
  return result.accessToken;
}

async function resolveSiteId(token: string): Promise<string> {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (siteId) return siteId;

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("Neither SHAREPOINT_SITE_ID nor SHAREPOINT_SITE_URL is set in .env.local");

  const u = new URL(siteUrl);
  const hostname = u.hostname;
  let sitePath = u.pathname.replace(/\/+$/, "") || "/";

  const cutAt = sitePath.search(/\/SitePages|\/Lists|\/_layouts|\/Pages/);
  if (cutAt !== -1) sitePath = sitePath.slice(0, cutAt);
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;

  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Could not resolve site ID: ${res.status} — ${err}`);
  }

  const site = await res.json() as { id: string };
  return site.id;
}

async function graphRequest(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  return { ok: res.ok, status: res.status, data };
}

// ── Route Handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth guard — admin only
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as SessionUser;
    if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Auth check failed" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { action } = body;

  // SP_TEST_LIVE=true means use real SharePoint regardless of USE_MOCK_DATA
  // This lets you test one list live while the rest of the app stays on mock data
  const isLive = process.env.SP_TEST_LIVE === "true";
  if (!isLive) {
    return NextResponse.json({
      mode: "mock",
      notice: "SP_TEST_LIVE is not set to 'true' in .env.local — returning mock data. Set SP_TEST_LIVE=true and restart to test against real SharePoint.",
      action,
      items: action === "read" ? [
        { id: "mock-001", name: "Alice Demo", email: "alice@mock.com", phone: "+49 151 0001", address: "Musterstraße 1, Berlin" },
        { id: "mock-002", name: "Bob Demo",   email: "bob@mock.com",   phone: "+49 151 0002", address: "Musterstraße 2, München" },
      ] : undefined,
    });
  }

  // ── Live SharePoint mode ──────────────────────────────────
  try {
    const token = await getGraphToken();
    const siteId = await resolveSiteId(token);

    // Use the existing SCCG Client list (URL-encoded space = %20)
    const listName = "SCCG%20Client";
    const listBase = `/sites/${siteId}/lists/${listName}/items`;

    // ── READ ────────────────────────────────────────────────
    if (action === "read") {
      const { ok, status, data } = await graphRequest(
        token, "GET",
        `${listBase}?$expand=fields&$top=50&$orderby=fields/Modified desc`
      );
      if (!ok) return NextResponse.json({ error: `Graph returned ${status}`, detail: data }, { status });

      const raw = (data as { value: Array<{ id: string; fields: Record<string, string> }> }).value;
      const items = raw.map((item) => ({
        id:      item.id,
        name:    item.fields[COL.name]    || item.fields.Title || "",
        email:   item.fields[COL.email]   || "",
        phone:   item.fields[COL.phone]   || "",
        address: item.fields[COL.address] || "",
        // Return all raw fields too so we can see what's available
        _raw:    item.fields,
      }));

      return NextResponse.json({ ok: true, action: "read", count: items.length, items });
    }

    // ── CREATE ──────────────────────────────────────────────
    if (action === "create") {
      const { name, email, phone, address } = body as Record<string, string>;
      const { ok, status, data } = await graphRequest(token, "POST", listBase, {
        fields: {
          Title:         name,   // "Full name" maps to Title in this list
          [COL.email]:   email,
          [COL.phone]:   phone,
          [COL.address]: address,
        },
      });
      if (!ok) return NextResponse.json({ error: `Create failed: ${status}`, detail: data }, { status });
      return NextResponse.json({ ok: true, action: "create", created: data });
    }

    // ── UPDATE ──────────────────────────────────────────────
    if (action === "update") {
      const { id, phone } = body as { id: string; phone: string };
      if (!id) return NextResponse.json({ error: "id is required for update" }, { status: 400 });

      const { ok, status, data } = await graphRequest(token, "PATCH", `${listBase}/${id}/fields`, {
        // Update phone number as the test field
        [COL.phone]: phone || "+49 000 UPDATED " + new Date().toLocaleTimeString(),
      });
      if (!ok) return NextResponse.json({ error: `Update failed: ${status}`, detail: data }, { status });
      return NextResponse.json({ ok: true, action: "update", id, updated: data });
    }

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return NextResponse.json({ error: "id is required for delete" }, { status: 400 });

      const { ok, status, data } = await graphRequest(token, "DELETE", `${listBase}/${id}`);
      if (!ok && status !== 204) return NextResponse.json({ error: `Delete failed: ${status}`, detail: data }, { status });
      return NextResponse.json({ ok: true, action: "delete", id, message: "Item deleted from SCCG Client list on SharePoint" });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sp-test] Error:", message);
    return NextResponse.json({
      error: message,
      hint: message.includes("token")
        ? "Check AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_SECRET in .env.local"
        : message.includes("site") || message.includes("resolve")
        ? "Check SHAREPOINT_SITE_URL in .env.local"
        : message.includes("list") || message.includes("itemNotFound")
        ? "List name mismatch — check SharePoint list display name"
        : "See server console for full error details",
    }, { status: 500 });
  }
}
