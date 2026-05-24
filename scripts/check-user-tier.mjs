import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
env.split("\n").forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1].trim()] = v;
  }
});

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

async function run() {
  const r = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  const token = r.accessToken;
  
  const siteUrl = new URL(process.env.SHAREPOINT_SITE_URL);
  const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteUrl.hostname}:${siteUrl.pathname}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const site = await siteRes.json();
  
  const listsRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists?$filter=displayName eq 'Partners'`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const lists = await listsRes.json();
  const listId = lists.value[0].id;
  
  const itemsRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${listId}/items?$expand=fields`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const items = await itemsRes.json();
  
  for (const item of items.value) {
    console.log(item.fields.Title, "-> TierStatus:", item.fields.TierStatus, "MarginPercentage:", item.fields.MarginPercentage, "Email:", item.fields.Email);
  }
}

run();
