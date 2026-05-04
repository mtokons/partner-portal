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
} catch (e) {}

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

async function run() {
  const token = await getToken();
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  
  const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const site = await siteRes.json();
  const listBase = `https://graph.microsoft.com/v1.0/sites/${site.id}/lists/KanbanTasks/items`;
  
  // 1. Fetch item id 1
  console.log("Fetching item 1...");
  const itemRes = await fetch(`${listBase}('1')/fields`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Item fetch status:", itemRes.status);
  
  // 2. Patch item 1
  console.log("Patching item 1...");
  const patchRes = await fetch(`${listBase}('1')/fields`, {
    method: "PATCH",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      Status: "in-progress"
    })
  });
  
  if (!patchRes.ok) {
    console.error("Patch error:", await patchRes.text());
  } else {
    console.log("Patch successful!");
  }
}

run().catch(console.error);
