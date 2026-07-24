/**
 * Backfill WorkflowCategory for existing CandidateServices based on product name.
 * Maps service names to their correct workflow category.
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
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

// Map product names to workflow categories
function inferCategory(serviceName) {
  const n = (serviceName || "").toLowerCase();
  if (n.includes("student visa")) return "Student Visa";
  if (n.includes("opp") && n.includes("card")) return "Opportunity Card";
  if (n.includes("opportunity")) return "Opportunity Card";
  if (n.includes("ausbildung")) return "Ausbildung";
  if (n.includes("training")) return "Training";
  // Generic products — can't infer
  return null;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  // Get CandidateServices list
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const servicesList = lists.value.find((l) => l.displayName === "CandidateServices");
  if (!servicesList) {
    console.log("❌ CandidateServices list not found");
    return;
  }

  // Fetch all service items
  const listUrl = `/sites/${siteId}/lists/${servicesList.id}/items`;
  const items = await graphRequest("GET", `${listUrl}?$expand=fields&$top=500`);

  // Also get Candidates list for fallback lookup
  const candidatesList = lists.value.find((l) => l.displayName === "Candidates");
  const candidateCache = new Map();
  async function getCandidateCategory(candidateId) {
    if (!candidateId || !candidatesList) return null;
    if (candidateCache.has(candidateId)) return candidateCache.get(candidateId);
    try {
      const cand = await graphRequest("GET",
        `/sites/${siteId}/lists/${candidatesList.id}/items/${candidateId}?$expand=fields`
      );
      const cat = cand?.fields?.WorkflowCategory || null;
      candidateCache.set(candidateId, cat);
      return cat;
    } catch {
      candidateCache.set(candidateId, null);
      return null;
    }
  }
  
  let updated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const item of items.value) {
    const fields = item.fields;
    const existingCategory = fields.WorkflowCategory;
    const serviceName = fields.Title || "";

    if (existingCategory) {
      skipped++;
      continue; // already has a category
    }

    let inferred = inferCategory(serviceName);
    // Fallback: look up candidate's workflow category
    if (!inferred) {
      const candidateId = fields.CandidateId;
      inferred = await getCandidateCategory(candidateId);
    }
    if (!inferred) {
      console.log(`  ⚠ Cannot infer category for: "${serviceName}" (id=${item.id})`);
      noMatch++;
      continue;
    }

    console.log(`  Updating "${serviceName}" → ${inferred}`);
    await graphRequest("PATCH", `${listUrl}/${item.id}/fields`, {
      WorkflowCategory: inferred,
    });
    updated++;
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped (already set): ${skipped}, No match: ${noMatch}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
