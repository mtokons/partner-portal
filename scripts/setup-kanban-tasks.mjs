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
} catch (e) {}

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
  const existing = existingLists.value.find(l => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists.`);
    return existing.id;
  }

  console.log(`Creating list '${listName}'...`);
  const listBody = {
    displayName: listName,
    columns: columns,
    list: { template: "genericList" }
  };
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, listBody);
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
}

async function run() {
  try {
    const siteId = await resolveSiteId();
    console.log(`Site ID: ${siteId}`);

    // KanbanTasks
    await createListIfNotExists(siteId, "KanbanTasks", [
      { name: "Title", text: {} },
      { name: "Description", text: { allowMultipleLines: true } },
      { name: "Status", choice: { choices: ["backlog", "todo", "in-progress", "review", "done"] } },
      { name: "Priority", choice: { choices: ["low", "medium", "high", "critical"] } },
      { name: "DueDate", dateTime: {} },
      { name: "AssignedTo", text: {} },
      { name: "AssignedToName", text: {} },
      { name: "AssignedToEmail", text: {} },
      { name: "Tags", text: {} },
      { name: "Comments", text: { allowMultipleLines: true } }, // JSON Blob
      { name: "CreatedBy", text: {} },
      { name: "CreatedAt", dateTime: {} },
      { name: "UpdatedAt", dateTime: {} }
    ]);

    console.log("✅ KanbanTasks list provisioned successfully!");
  } catch (error) {
    console.error("Provisioning failed:", error);
  }
}

run();
