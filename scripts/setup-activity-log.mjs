import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// Load variables from .env.local (fallback .env.production)
for (const file of [".env.local", ".env.production"]) {
  try {
    const envFile = readFileSync(file, "utf-8");
    envFile.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (process.env[key]) return; // first file wins
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

async function getToken() {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  return result.accessToken;
}

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 404 && method === "GET") return null;
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL not set");
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function createListIfNotExists(siteId, listName, columns) {
  const existingLists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = existingLists.value.find((l) => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists (${existing.id}). Skipping.`);
    return existing.id;
  }
  console.log(`Creating list '${listName}'...`);
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, {
    displayName: listName,
    columns,
    list: { template: "genericList" },
  });
  console.log(`✅ List '${listName}' created (${newList.id})`);
  return newList.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  // ── ActivityLog (audit trail: who did what and when) ──────────────────────
  await createListIfNotExists(siteId, "ActivityLog", [
    { name: "Title", text: {} },          // actor email (mapped to Title)
    { name: "ActorId", text: {} },
    { name: "ActorName", text: {} },
    { name: "ActorRole", text: {} },
    { name: "Action", text: {} },
    { name: "Description", text: { allowMultipleLines: true } },
    { name: "TargetId", text: {} },
    { name: "TargetEmail", text: {} },
    { name: "TargetName", text: {} },
    { name: "Console", text: {} },
    { name: "IpAddress", text: {} },
    { name: "UserAgent", text: { allowMultipleLines: true } },
    { name: "CreatedAt", dateTime: {} },
  ]);

  console.log("\n✅ ActivityLog provisioning complete.");
}

run().catch((err) => {
  console.error("❌ Provisioning failed:", err.message);
  process.exit(1);
});
