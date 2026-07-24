/**
 * setup-projects-lists.mjs
 * Provisions SharePoint lists for the Project Partner feature:
 *   - Projects        (collaboration projects shared with external partners)
 *   - ProjectStaffing (expert staffing matrix rows)
 * Run: node scripts/setup-projects-lists.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import "dotenv/config";
import { readFileSync } from "fs";

try {
  const envFile = readFileSync(".env.local", "utf-8");
  envFile.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) { let v = m[2].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); process.env[m[1].trim()] = v; }
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
  const r = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  return r.accessToken;
}
async function graph(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { if (res.status === 404 && method === "GET") return null; throw new Error(`Graph ${res.status}: ${await res.text()}`); }
  return res.status !== 204 ? res.json() : null;
}
async function resolveSiteId() {
  const u = new URL(process.env.SHAREPOINT_SITE_URL);
  let sitePath = u.pathname.replace(/\/+$/, ""); if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  return (await graph("GET", `/sites/${u.hostname}:${sitePath}`)).id;
}
async function createList(siteId, name, columns) {
  const lists = await graph("GET", `/sites/${siteId}/lists`);
  const ex = lists.value.find((l) => l.displayName === name);
  if (ex) { console.log(`✓ ${name} exists`); return; }
  await graph("POST", `/sites/${siteId}/lists`, { displayName: name, columns, list: { template: "genericList" } });
  console.log(`+ ${name} created`);
}
async function run() {
  const siteId = await resolveSiteId();
  await createList(siteId, "Projects", [
    { name: "Code", text: {} }, { name: "Client", text: {} },
    { name: "PartnerName", text: {} }, { name: "PartnerEmail", text: {} },
    { name: "Description", text: { allowMultipleLines: true } },
    { name: "Status", choice: { choices: ["active", "completed", "on-hold"] } },
    { name: "StartDate", text: {} }, { name: "EndDate", text: {} },
    { name: "CreatedAt", text: {} }, { name: "UpdatedAt", text: {} },
  ]);
  await createList(siteId, "ProjectStaffing", [
    { name: "ProjectId", text: {} }, { name: "Position", text: {} },
    { name: "WorkPackage", text: { allowMultipleLines: true } }, { name: "FocusObjective", text: { allowMultipleLines: true } },
    { name: "Education", text: { allowMultipleLines: true } }, { name: "ProfExperience", text: { allowMultipleLines: true } },
    { name: "SpecificExperience", text: { allowMultipleLines: true } }, { name: "DevCooperation", text: { allowMultipleLines: true } },
    { name: "ExpertId", text: {} }, { name: "Expertise", text: { allowMultipleLines: true } },
    { name: "CvFileName", text: {} },
    { name: "ActiveStatus", choice: { choices: ["active", "standby", "unavailable"] } },
    { name: "Notes", text: { allowMultipleLines: true } },
    { name: "SortOrder", number: {} },
    { name: "CreatedAt", text: {} }, { name: "UpdatedAt", text: {} },
  ]);
  console.log("\n✅ Project Partner lists ready.");
}
run().catch((e) => { console.error("Setup failed:", e); process.exit(1); });
