import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';
import { readFileSync } from 'fs';

try {
  const envFile = readFileSync('.env.local', 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
} catch {}

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});
const getToken = async () => (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken;

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { if (res.status === 404 && method === "GET") return null; throw new Error(`Graph API error: ${res.status} ${await res.text()}`); }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  let sitePath = pathname.replace(/\/+$/, ""); if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  return (await graphRequest("GET", `/sites/${hostname}:${sitePath}`)).id;
}

async function ensureColumns(siteId, listId, columns) {
  const existing = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/columns`);
  const have = new Set(existing.value.map(c => c.name));
  for (const col of columns) {
    if (have.has(col.name)) continue;
    console.log(`  + adding column ${col.name}`);
    await graphRequest("POST", `/sites/${siteId}/lists/${listId}/columns`, col);
  }
}

async function createListIfNotExists(siteId, listName, columns) {
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = lists.value.find(l => l.displayName === listName);
  if (existing) { console.log(`List '${listName}' exists. Ensuring columns…`); await ensureColumns(siteId, existing.id, columns); return existing.id; }
  console.log(`Creating list '${listName}'…`);
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, { displayName: listName, columns, list: { template: "genericList" } });
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
}

const multiline = { allowMultipleLines: true, appendChangesToExistingText: false, linesForEditing: 6, textType: "plain" };

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  await createListIfNotExists(siteId, "TorExcerpts", [
    { name: "ProjectId", text: {} },
    { name: "ProjectName", text: {} },
    { name: "Role", text: {} },
    { name: "Position", text: {} },
    { name: "FileName", text: {} },
    { name: "Summary", text: multiline },
    { name: "ExcerptText", text: multiline },
    { name: "ExcerptJson", text: multiline },
    { name: "RawText", text: multiline },
    { name: "Provider", text: {} },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  await createListIfNotExists(siteId, "EvaluationMatrices", [
    { name: "ProjectId", text: {} },
    { name: "ProjectName", text: {} },
    { name: "Role", text: {} },
    { name: "FileName", text: {} },
    { name: "CriteriaJson", text: multiline },
    { name: "RawText", text: multiline },
    { name: "MaxTotal", number: {} },
    { name: "Provider", text: {} },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  console.log("\n✅ ToR Excerpt & Evaluation Matrix SharePoint lists are ready.");
}

run().catch((err) => { console.error("Setup failed:", err); process.exit(1); });
