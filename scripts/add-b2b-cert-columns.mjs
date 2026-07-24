/**
 * Adds CertCode and CertIssuedAt columns to the B2BCompanies SharePoint list.
 * Also adds City and LogoUrl if missing.
 * Run once: node scripts/add-b2b-cert-columns.mjs
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
  let b2bList = lists.value.find((l) => l.displayName === "B2BCompanies");

  if (!b2bList) {
    console.log("B2BCompanies list not found — creating it...");
    b2bList = await graphRequest("POST", `/sites/${siteId}/lists`, {
      displayName: "B2BCompanies",
      list: { template: "genericList" },
    });
    console.log(`✅ Created B2BCompanies (${b2bList.id})\n`);
  } else {
    console.log(`Found B2BCompanies (${b2bList.id})\n`);
  }

  // All columns needed by the app (Title is auto-created by SharePoint)
  const cols = [
    { name: "PartnerId",     def: { name: "PartnerId",     text: {} } },
    { name: "PartnerName",   def: { name: "PartnerName",   text: {} } },
    { name: "CompanyName",   def: { name: "CompanyName",   text: {} } },
    { name: "ContactPerson", def: { name: "ContactPerson", text: {} } },
    { name: "ContactNumber", def: { name: "ContactNumber", text: {} } },
    { name: "Email",         def: { name: "Email",         text: {} } },
    { name: "Address",       def: { name: "Address",       text: {} } },
    { name: "City",          def: { name: "City",          text: {} } },
    { name: "Website",       def: { name: "Website",       text: {} } },
    { name: "Industry",      def: { name: "Industry",      text: {} } },
    { name: "LogoUrl",       def: { name: "LogoUrl",       text: {} } },
    { name: "Status",        def: { name: "Status",        text: {} } },
    { name: "AgreementUrl",  def: { name: "AgreementUrl",  text: {} } },
    { name: "CertCode",      def: { name: "CertCode",      text: {} } },
    { name: "CertIssuedAt",  def: { name: "CertIssuedAt",  text: {} } },
    { name: "Notes",         def: { name: "Notes",         text: {} } },
    { name: "CreatedAt",     def: { name: "CreatedAt",     text: {} } },
    { name: "UpdatedAt",     def: { name: "UpdatedAt",     text: {} } },
  ];

  for (const { name, def } of cols) {
    await ensureColumn(siteId, b2bList.id, "B2BCompanies", name, def);
  }

  console.log("\n✅ Done. Re-issue a certificate to test the verify flow.");
}

run().catch((err) => { console.error(err); process.exit(1); });
