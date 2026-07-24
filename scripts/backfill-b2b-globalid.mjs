/**
 * Backfills a unique GlobalId for existing B2BCompanies items that don't have one.
 * Run once: node scripts/backfill-b2b-globalid.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

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

async function run() {
  const siteId = await resolveSiteId();
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const b2bList = lists.value.find((l) => l.displayName === "B2BCompanies");
  if (!b2bList) throw new Error("B2BCompanies list not found");

  const items = await graphRequest("GET", `/sites/${siteId}/lists/${b2bList.id}/items?$expand=fields&$top=500`);
  let updated = 0;
  for (const item of items.value) {
    const f = item.fields || {};
    if (f.GlobalId && String(f.GlobalId).trim()) {
      console.log(`  ✓ #${item.id} ${f.CompanyName || ""} already has ${f.GlobalId}`);
      continue;
    }
    const globalId = `SCCG-B2B-${randomBytes(4).toString("hex").toUpperCase()}`;
    await graphRequest("PATCH", `/sites/${siteId}/lists/${b2bList.id}/items/${item.id}/fields`, { GlobalId: globalId });
    console.log(`  ✅ #${item.id} ${f.CompanyName || ""} → ${globalId}`);
    updated++;
  }
  console.log(`\n✅ Done. ${updated} item(s) updated.`);
}

run().catch((err) => { console.error(err); process.exit(1); });
