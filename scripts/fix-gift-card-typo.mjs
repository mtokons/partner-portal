/**
 * One-off script: fix "SCCG Gift crad" → "SCCG Gift Card" in SharePoint Products list.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf-8");
envFile.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});

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
  const headers = {
    Authorization: `Bearer ${token}`,
    "Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly",
  };
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
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  const sitePath = pathname.replace(/\/+$/, "") || "/";
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log("Site ID:", siteId);

  // Find the Products list
  const lists = await graphRequest("GET", `/sites/${siteId}/lists?$filter=displayName eq 'Products'`);
  const productList = lists.value[0];
  if (!productList) throw new Error("Products list not found");
  console.log("Products list ID:", productList.id);

  // Find item with Sku = SCCG-GC or Title containing "crad"
  const items = await graphRequest(
    "GET",
    `/sites/${siteId}/lists/${productList.id}/items?$expand=fields&$filter=fields/Title eq 'SCCG Gift crad'`
  );

  if (!items?.value?.length) {
    console.log("No item found with title 'SCCG Gift crad'. Trying Sku filter...");
    const bySkuItems = await graphRequest(
      "GET",
      `/sites/${siteId}/lists/${productList.id}/items?$expand=fields&$filter=fields/Sku eq 'SCCG-GC'`
    );
    if (!bySkuItems?.value?.length) {
      console.log("No item found with Sku 'SCCG-GC' either. Nothing to fix.");
      return;
    }
    items.value = bySkuItems.value;
  }

  for (const item of items.value) {
    console.log(`Found: ID=${item.id} Title="${item.fields.Title}" Sku="${item.fields.Sku}"`);
    await graphRequest(
      "PATCH",
      `/sites/${siteId}/lists/${productList.id}/items/${item.id}/fields`,
      { Title: "SCCG Gift Card" }
    );
    console.log(`✅ Updated item ${item.id} → "SCCG Gift Card"`);
  }
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
