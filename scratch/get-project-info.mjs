import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// Load env from .env.production or .env.local
try {
  const env = readFileSync(".env.production", "utf-8");
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

async function run() {
  const r = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  const token = r.accessToken;
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/Projects/items/1?$expand=fields`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  console.log("Project fields:", JSON.stringify(data.fields, null, 2));
}

run().catch(console.error);
