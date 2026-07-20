/**
 * add-staffing-matrix-columns.mjs — adds official matrix columns to ProjectStaffing.
 * Run: node scripts/add-staffing-matrix-columns.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (!process.env.AZURE_AD_CLIENT_ID) dotenv.config({ path: ".env.production" });

const cca = new ConfidentialClientApplication({ auth: { clientId: process.env.AZURE_AD_CLIENT_ID, authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`, clientSecret: process.env.AZURE_AD_CLIENT_SECRET } });
async function tok() { return (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken; }
async function g(m, u, b) { const h = { Authorization: `Bearer ${await tok()}` }; if (b) h["Content-Type"] = "application/json"; const r = await fetch(`https://graph.microsoft.com/v1.0${u}`, { method: m, headers: h, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) { if (r.status === 404 && m === "GET") return null; throw new Error(`${m} ${r.status}: ${await r.text()}`); } return r.status !== 204 ? r.json() : null; }
async function sid() { const u = new URL(process.env.SHAREPOINT_SITE_URL); let p = u.pathname.replace(/\/+$/, ""); if (!p.startsWith("/")) p = "/" + p; return (await g("GET", `/sites/${u.hostname}:${p}`)).id; }

const COLS = ["WorkPackage", "FocusObjective", "Education", "ProfExperience", "SpecificExperience", "DevCooperation"];
const s = await sid();
const existing = (await g("GET", `/sites/${s}/lists/ProjectStaffing/columns`)).value.map((c) => c.name);
for (const name of COLS) {
  if (existing.includes(name)) { console.log(`✓ ${name}`); continue; }
  await g("POST", `/sites/${s}/lists/ProjectStaffing/columns`, { name, text: { allowMultipleLines: true } });
  console.log(`+ ${name}`);
}
console.log("done");
