/**
 * Adds the boolean `ServiceUnlocked` column to the Candidates SharePoint list.
 * Backs the admin "Special Approval" override that unlocks service start
 * without payment. Run: node scripts/add-service-unlocked-column.mjs
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
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const candidatesList = lists.value.find((l) => l.displayName === "Candidates");
  if (!candidatesList) { console.log("❌ Candidates list not found"); return; }
  console.log(`Found Candidates (${candidatesList.id})`);

  const cols = await graphRequest("GET", `/sites/${siteId}/lists/${candidatesList.id}/columns`);
  if (cols.value.find((c) => c.name === "ServiceUnlocked")) {
    console.log("Column 'ServiceUnlocked' already exists. Skipping.");
  } else {
    console.log("Adding 'ServiceUnlocked' column...");
    await graphRequest("POST", `/sites/${siteId}/lists/${candidatesList.id}/columns`, {
      name: "ServiceUnlocked",
      boolean: {},
    });
    console.log("✅ Column added.");
  }

  console.log("\n✅ Done!");
}

run().catch((e) => { console.error(e); process.exit(1); });
