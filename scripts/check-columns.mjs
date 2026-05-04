import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// ---------- env loader ----------
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

async function graph(url) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function main() {
  const siteUrl = new URL(process.env.SHAREPOINT_SITE_URL);
  const site = await graph(`/sites/${siteUrl.hostname}:${siteUrl.pathname.replace(/\/+$/, "")}`);
  const siteId = site.id;
  
  const lists = await graph(`/sites/${siteId}/lists`);
  const clientsList = lists.value.find(l => l.displayName === "Clients" || l.displayName === "SCCG Client");
  
  if (!clientsList) {
    console.log("Clients list not found");
    return;
  }
  
  console.log(`Checking list: ${clientsList.displayName} (${clientsList.id})`);
  const columns = await graph(`/sites/${siteId}/lists/${clientsList.id}/columns`);
  console.log("Columns:");
  columns.value.forEach(c => {
    console.log(` - ${c.name} (displayName: ${c.displayName})`);
  });
}

main().catch(console.error);
