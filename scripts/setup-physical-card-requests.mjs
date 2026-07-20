/**
 * Creates the PhysicalCardRequests SharePoint list (idempotent).
 *
 * Run: node scripts/setup-physical-card-requests.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// Load .env.local
try {
  const env = readFileSync(".env.local", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

const REQUIRED = ["AZURE_AD_CLIENT_ID", "AZURE_AD_TENANT_ID", "AZURE_AD_CLIENT_SECRET", "SHAREPOINT_SITE_URL"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) { console.error("Missing env:", missing.join(", ")); process.exit(1); }

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

let cachedToken = null;
async function getToken() {
  if (cachedToken) return cachedToken;
  const r = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  cachedToken = r.accessToken;
  return cachedToken;
}

async function graph(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 404 && method === "GET") return null;
    const text = await res.text();
    throw new Error(`Graph ${method} ${url} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function resolveSiteId() {
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  const sitePath = pathname.replace(/\/+$/, "") || "/";
  const site = await graph("GET", `/sites/${hostname}:${sitePath}`);
  if (!site?.id) throw new Error("Could not resolve site id");
  return site.id;
}

async function listExists(siteId, name) {
  const res = await graph("GET", `/sites/${siteId}/lists?$filter=displayName eq '${name}'&$select=id,displayName`);
  return res?.value?.length > 0;
}

async function createColumn(siteId, listId, col) {
  await graph("POST", `/sites/${siteId}/lists/${listId}/columns`, col).catch((e) => {
    if (/already exists|duplicate/i.test(e.message)) {
      console.log(`  ↳ column "${col.name}" already exists — skipped`);
    } else {
      throw e;
    }
  });
}

async function run() {
  const siteId = await resolveSiteId();
  console.log("✅ Site resolved:", siteId);

  const LIST_NAME = "PhysicalCardRequests";

  if (await listExists(siteId, LIST_NAME)) {
    console.log(`ℹ️  List "${LIST_NAME}" already exists — adding any missing columns...`);
    const list = (await graph("GET", `/sites/${siteId}/lists?$filter=displayName eq '${LIST_NAME}'&$select=id`)).value[0];
    await addColumns(siteId, list.id);
    return;
  }

  console.log(`➕ Creating list "${LIST_NAME}"...`);
  const list = await graph("POST", `/sites/${siteId}/lists`, {
    displayName: LIST_NAME,
    columns: [],
    list: { template: "genericList" },
  });
  console.log(`✅ List created: ${list.id}`);

  await addColumns(siteId, list.id);
}

async function addColumns(siteId, listId) {
  const columns = [
    { name: "UserId",       text: {} },
    { name: "UserName",     text: {} },
    { name: "UserEmail",    text: {} },
    { name: "FullName",     text: {} },
    { name: "AddressLine1", text: {} },
    { name: "AddressLine2", text: {} },
    { name: "City",         text: {} },
    { name: "PostalCode",   text: {} },
    { name: "Country",      text: {} },
    { name: "Fee",          number: {} },
    { name: "Currency",     text: {} },
    { name: "Status",       choice: { choices: ["pending", "processing", "shipped", "rejected"] } },
    { name: "Notes",        text: { allowMultipleLines: true } },
    { name: "RequestedAt",  dateTime: {} },
    { name: "ProcessedAt",  dateTime: {} },
  ];

  for (const col of columns) {
    process.stdout.write(`  Adding column "${col.name}"... `);
    await createColumn(siteId, listId, col);
    console.log("done");
  }

  console.log("✅ All columns ready.");
}

run().catch((e) => { console.error("❌", e.message); process.exit(1); });
