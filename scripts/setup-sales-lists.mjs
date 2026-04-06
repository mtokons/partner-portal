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

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    if (res.status === 404 && method === "GET") return null;
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL not set");
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function createListIfNotExists(siteId, listName, columns) {
  const existingLists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = existingLists.value.find(l => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists.`);
    return existing.id;
  }

  console.log(`Creating list '${listName}'...`);
  const listBody = {
    displayName: listName,
    columns: columns,
    list: { template: "genericList" }
  };
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, listBody);
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
}

async function run() {
  try {
    const siteId = await resolveSiteId();
    console.log(`Site ID: ${siteId}`);

    // 1. SalesOffers
    await createListIfNotExists(siteId, "SalesOffers", [
      { name: "OfferNumber", text: {} },
      { name: "PartnerId", text: {} },
      { name: "PartnerName", text: {} },
      { name: "ClientId", text: {} },
      { name: "ClientName", text: {} },
      { name: "ClientEmail", text: {} },
      { name: "Status", choice: { choices: ["draft", "sent", "accepted", "rejected"] } },
      { name: "Subtotal", currency: { locale: "de-DE" } },
      { name: "Discount", number: {} },
      { name: "DiscountType", choice: { choices: ["fixed", "percent"] } },
      { name: "TotalAmount", currency: { locale: "de-DE" } },
      { name: "ValidUntil", dateTime: {} },
      { name: "Notes", text: { allowMultipleLines: true } },
      { name: "CreatedBy", text: {} },
      { name: "CreatedAt", dateTime: {} },
      { name: "UpdatedAt", dateTime: {} },
      { name: "SentAt", dateTime: {} },
      { name: "AcceptedAt", dateTime: {} },
      { name: "RejectedAt", dateTime: {} },
      { name: "SalesOrderId", text: {} },
      { name: "SaleType", choice: { choices: ["direct", "referral"] } },
      { name: "ReferralId", text: {} },
      { name: "ReferralName", text: {} },
      { name: "ReferralPercent", number: {} }
    ]);

    // 2. SalesOfferItems
    await createListIfNotExists(siteId, "SalesOfferItems", [
      { name: "SalesOfferId", text: {} },
      { name: "ProductId", text: {} },
      { name: "ProductName", text: {} },
      { name: "Quantity", number: {} },
      { name: "UnitPrice", currency: { locale: "de-DE" } },
      { name: "TotalPrice", currency: { locale: "de-DE" } }
    ]);

    // 3. SalesOrders
    await createListIfNotExists(siteId, "SalesOrders", [
      { name: "OrderNumber", text: {} },
      { name: "SalesOfferId", text: {} },
      { name: "OfferNumber", text: {} },
      { name: "PartnerId", text: {} },
      { name: "PartnerName", text: {} },
      { name: "ClientId", text: {} },
      { name: "ClientName", text: {} },
      { name: "ClientEmail", text: {} },
      { name: "Status", choice: { choices: ["processing", "confirmed", "shipped", "delivered", "cancelled"] } },
      { name: "TotalAmount", currency: { locale: "de-DE" } },
      { name: "Notes", text: { allowMultipleLines: true } },
      { name: "CreatedBy", text: {} },
      { name: "CreatedAt", dateTime: {} },
      { name: "UpdatedAt", dateTime: {} }
    ]);

    // 4. SalesOrderItems
    await createListIfNotExists(siteId, "SalesOrderItems", [
      { name: "SalesOrderId", text: {} },
      { name: "ProductId", text: {} },
      { name: "ProductName", text: {} },
      { name: "Quantity", number: {} },
      { name: "UnitPrice", currency: { locale: "de-DE" } },
      { name: "TotalPrice", currency: { locale: "de-DE" } }
    ]);

    console.log("✅ All sales lists provisioned successfully!");
  } catch (error) {
    console.error("Provisioning failed:", error);
  }
}

run();
