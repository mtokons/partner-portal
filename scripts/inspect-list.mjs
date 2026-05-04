/**
 * Inspect a SharePoint list's content via Graph.
 * Usage: node scripts/inspect-list.mjs <ListName>
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

try {
  const env = readFileSync(".env.local", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

const listName = process.argv[2] || "KanbanTasks";

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

const t = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
const auth = { Authorization: `Bearer ${t.accessToken}` };
const u = new URL(process.env.SHAREPOINT_SITE_URL);
const sitePath = u.pathname.replace(/\/+$/, "") || "/";
const site = await fetch(`https://graph.microsoft.com/v1.0/sites/${u.hostname}:${sitePath}`, { headers: auth }).then(r => r.json());
console.log("Site:", site.displayName, site.id);

const lists = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists?$filter=displayName eq '${listName}'`, { headers: auth }).then(r => r.json());
const list = lists.value?.[0];
if (!list) { console.error("List not found:", listName); process.exit(1); }
console.log("List:", list.displayName, list.id);

const items = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items?$expand=fields&$top=20`, { headers: auth }).then(r => r.json());
console.log("Item count returned:", items.value?.length || 0);
if (items.value?.[0]) {
  console.log("First item fields:", JSON.stringify(items.value[0].fields, null, 2));
}

const columns = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/columns`, { headers: auth }).then(r => r.json());
console.log("\nColumns:");
columns.value?.forEach(c => {
  console.log(` - ${c.name} (displayName: ${c.displayName})`);
});
