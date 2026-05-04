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

async function graphRequest(method, url) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function resolveSiteId() {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (siteId) return siteId;

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL not set");
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function run() {
  try {
    const siteId = await resolveSiteId();
    console.log(`Site ID: ${siteId}`);

    const lists = await graphRequest("GET", `/sites/${siteId}/lists?$select=name,displayName,id`);
    
    console.log("--- SHAREPOINT LISTS ---");
    lists.value.forEach(l => {
      console.log(`DisplayName: "${l.displayName}" | Name (Internal): "${l.name}" | ID: ${l.id}`);
    });
    console.log("------------------------");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
