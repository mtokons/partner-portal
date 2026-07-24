import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';
import { readFileSync } from 'fs';

// Load variables from .env.local
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

async function getToken() {
  const result = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  return result.accessToken;
}

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 404 && method === "GET") return null;
    throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
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
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = lists.value.find(l => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists (ID: ${existing.id}). Ensuring columns…`);
    await ensureColumns(siteId, existing.id, columns);
    return existing.id;
  }
  console.log(`Creating list '${listName}'…`);
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, {
    displayName: listName, columns, list: { template: "genericList" },
  });
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
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

async function addColumnsToList(siteId, listName, columns) {
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const list = lists.value.find(l => l.displayName === listName);
  if (!list) { console.log(`List '${listName}' not found — skipping column add.`); return; }
  console.log(`Ensuring columns on '${listName}'…`);
  await ensureColumns(siteId, list.id, columns);
}

const multiline = { allowMultipleLines: true, appendChangesToExistingText: false, linesForEditing: 6, textType: "plain" };

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  await createListIfNotExists(siteId, "ProjectOrgs", [
    { name: "AdminEmails", text: multiline },
    { name: "LogoUrl", text: {} },
    { name: "PrimaryColor", text: {} },
    { name: "Status", choice: { choices: ["active", "inactive"] } },
    { name: "Notes", text: multiline },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  await createListIfNotExists(siteId, "CvFormTemplates", [
    { name: "ProjectId", text: {} },
    { name: "FieldsJson", text: multiline },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  await createListIfNotExists(siteId, "EvaluationTemplates", [
    { name: "ProjectId", text: {} },
    { name: "EvalKey", text: {} },
    { name: "MinPercent", number: {} },
    { name: "CriteriaJson", text: multiline },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  await createListIfNotExists(siteId, "ExpertCvIntake", [
    { name: "ProjectId", text: {} },
    { name: "OrgId", text: {} },
    { name: "Position", text: {} },
    { name: "CvFileName", text: {} },
    { name: "RawText", text: multiline },
    { name: "FormJson", text: multiline },
    { name: "ProfileJson", text: multiline },
    { name: "EvalKey", text: {} },
    { name: "Status", choice: { choices: ["draft", "review", "published"] } },
    { name: "AiProvider", text: {} },
    { name: "EvaluationId", text: {} },
    { name: "Notes", text: multiline },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  // Extend the existing Projects list with PPMS linkage columns.
  await addColumnsToList(siteId, "Projects", [
    { name: "OrgId", text: {} },
    { name: "CvFormTemplateId", text: {} },
    { name: "EvaluationTemplateId", text: {} },
  ]);

  console.log("\n✅ PPMS SharePoint lists are ready.");
}

run().catch((err) => { console.error("Setup failed:", err); process.exit(1); });
