/**
 * Creates the `SuccessStories` SharePoint list used by the Successful Candidate
 * Gallery "Add Success Story" feature. Run: node scripts/add-success-stories-list.mjs
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
  const result = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
  return result.accessToken;
}

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${res.status}: ${text}`);
  }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  let list = lists.value.find((l) => l.displayName === "SuccessStories");
  if (list) {
    console.log(`SuccessStories list already exists (${list.id}).`);
  } else {
    console.log("Creating 'SuccessStories' list...");
    list = await graphRequest("POST", `/sites/${siteId}/lists`, {
      displayName: "SuccessStories",
      list: { template: "genericList" },
      columns: [
        { name: "Profession", text: {} },
        { name: "Service", text: {} },
        { name: "PhotoUrl", text: {} },
        { name: "Story", text: { allowMultipleLines: true } },
        { name: "IsPublished", boolean: {} },
        { name: "CreatedBy", text: {} },
        { name: "CreatedAt", dateTime: {} },
      ],
    });
    console.log(`✅ SuccessStories list created (${list.id}).`);
  }

  console.log("\n✅ Done!");
}

run().catch((e) => { console.error(e); process.exit(1); });
