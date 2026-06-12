/**
 * Adds the missing WorkflowCategory column to the CandidateServices SP list.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// Load .env.local
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
    const text = await res.text();
    throw new Error(`Graph ${res.status}: ${text}`);
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

async function findList(siteId, listName) {
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  return lists.value.find((l) => l.displayName === listName);
}

async function addColumnIfMissing(siteId, listId, listName, columnDef) {
  // Check if column already exists
  const cols = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/columns`);
  const existing = cols.value.find((c) => c.name === columnDef.name);
  if (existing) {
    console.log(`  Column '${columnDef.name}' already exists in '${listName}'. Skipping.`);
    return;
  }
  console.log(`  Adding column '${columnDef.name}' to '${listName}'...`);
  await graphRequest("POST", `/sites/${siteId}/lists/${listId}/columns`, columnDef);
  console.log(`  ✅ Column '${columnDef.name}' added.`);
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  const workflowCategoryCol = {
    name: "WorkflowCategory",
    choice: { choices: ["Training", "Ausbildung", "Student Visa", "Opportunity Card"] },
  };

  // Add to CandidateServices
  const servicesList = await findList(siteId, "CandidateServices");
  if (servicesList) {
    console.log(`Found CandidateServices list (${servicesList.id})`);
    await addColumnIfMissing(siteId, servicesList.id, "CandidateServices", workflowCategoryCol);
  } else {
    console.log("❌ CandidateServices list not found!");
  }

  // Also verify CandidateTasks has it
  const tasksList = await findList(siteId, "CandidateTasks");
  if (tasksList) {
    console.log(`Found CandidateTasks list (${tasksList.id})`);
    await addColumnIfMissing(siteId, tasksList.id, "CandidateTasks", workflowCategoryCol);
  } else {
    console.log("❌ CandidateTasks list not found!");
  }

  console.log("\n✅ Done!");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
