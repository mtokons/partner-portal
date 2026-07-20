/**
 * Adds GlobalId, EntityType, RegistrationNumber and Designation columns to the
 * B2BCompanies SharePoint list (idempotent).
 * Run once: node scripts/add-b2b-extra-columns.mjs
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
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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

async function ensureColumn(siteId, listId, listName, colName, colDef) {
  const cols = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/columns`);
  const existing = cols.value.find((c) => c.name === colName);
  if (existing) {
    console.log(`  ✓ '${colName}' already exists (skipping)`);
    return;
  }
  console.log(`  + Adding '${colName}' to ${listName}...`);
  await graphRequest("POST", `/sites/${siteId}/lists/${listId}/columns`, colDef);
  console.log(`  ✅ '${colName}' added.`);
}

async function run() {
  console.log("Connecting to SharePoint...");
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const b2bList = lists.value.find((l) => l.displayName === "B2BCompanies");
  if (!b2bList) {
    throw new Error("B2BCompanies list not found. Run scripts/add-b2b-cert-columns.mjs first.");
  }
  console.log(`Found B2BCompanies (${b2bList.id})\n`);

  const cols = [
    { name: "GlobalId",           def: { name: "GlobalId",           text: {} } },
    { name: "EntityType",         def: { name: "EntityType",         text: {} } },
    { name: "RegistrationNumber", def: { name: "RegistrationNumber", text: {} } },
    { name: "Designation",        def: { name: "Designation",        text: {} } },
  ];

  for (const { name, def } of cols) {
    await ensureColumn(siteId, b2bList.id, "B2BCompanies", name, def);
  }

  console.log("\n✅ Done. New B2B columns provisioned.");
}

run().catch((err) => { console.error(err); process.exit(1); });
