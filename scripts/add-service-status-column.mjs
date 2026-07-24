/**
 * Adds CurrentStatus column to CandidateServices SP list
 * and backfills all existing services with "REGISTERED" as default.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

try {
  const envFile = readFileSync(".env.local", "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
} catch (_) {}

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

async function getToken() {
  const result = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  return result.accessToken;
}

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${res.status}: ${text}`);
  }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const servicesList = lists.value.find((l) => l.displayName === "CandidateServices");
  if (!servicesList) { console.log("❌ CandidateServices not found"); return; }
  console.log(`Found CandidateServices (${servicesList.id})`);

  // Check if CurrentStatus column exists
  const cols = await graphRequest("GET", `/sites/${siteId}/lists/${servicesList.id}/columns`);
  const hasCol = cols.value.find((c) => c.name === "CurrentStatus");
  if (hasCol) {
    console.log("Column 'CurrentStatus' already exists. Skipping column creation.");
  } else {
    console.log("Adding 'CurrentStatus' column...");
    await graphRequest("POST", `/sites/${siteId}/lists/${servicesList.id}/columns`, {
      name: "CurrentStatus",
      text: {},
    });
    console.log("✅ Column added.");
  }

  // Backfill: set CurrentStatus = "REGISTERED" for items that don't have it
  const listUrl = `/sites/${siteId}/lists/${servicesList.id}/items`;
  const items = await graphRequest("GET", `${listUrl}?$expand=fields&$top=500`);
  let updated = 0;
  for (const item of items.value) {
    if (!item.fields.CurrentStatus) {
      await graphRequest("PATCH", `${listUrl}/${item.id}/fields`, { CurrentStatus: "REGISTERED" });
      updated++;
    }
  }
  console.log(`✅ Backfilled ${updated} services with CurrentStatus = REGISTERED`);
}

run().catch((err) => { console.error("Fatal:", err); process.exit(1); });
