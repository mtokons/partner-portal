import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';

// Load variables precisely from .env.local
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});

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

async function graphPost(url, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function graphGet(url) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function resolveSiteId() {
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  
  const site = await graphGet(`/sites/${hostname}:${sitePath}`);
  if (!site) throw new Error("Could not resolve site ID");
  return site.id;
}

async function run() {
  try {
    console.log("Resolving SharePoint Site ID...");
    const siteId = await resolveSiteId();
    console.log(`Site ID resolved: ${siteId}`);

    console.log("Creating Products list...");
    const listBody = {
      displayName: "Products",
      columns: [
        { name: "Sku", number: { minimum: 0 } },
        { name: "Description", text: { allowMultipleLines: true } },
        { name: "Unit", choice: { choices: ["Package", "session", "Course"] } },
        { name: "SessionsCount", number: {} },
        { name: "CostPrice", currency: { locale: "en-US" } },
        { name: "RetailPriceVat", currency: { locale: "en-US" } },
        { name: "IsAvailable", boolean: {} },
        { name: "Category", text: {} },
        { name: "ImageUrl", text: {} },
        { name: "Discount", number: {} },
        { name: "DiscountType", choice: { choices: ["fixed", "percent"] } },
        { name: "SalesTags", text: {} },
        { name: "SortOrder", number: {} }
      ],
      list: { template: "genericList" }
    };

    let listId;
    try {
      const listData = await graphPost(`/sites/${siteId}/lists`, listBody);
      listId = listData.id;
      console.log(`Created new list 'Products' with ID: ${listId}`);
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("List 'Products' already exists. Fetching existing ID...");
        const existingLists = await graphGet(`/sites/${siteId}/lists`);
        const item = existingLists.value.find(l => l.displayName === "Products");
        listId = item.id;
      } else {
        throw err;
      }
    }

    console.log("Seeding test products...");

    const seedProducts = [
      {
        fields: {
          Title: "Standard Expert Retainer",
          Sku: 10001,
          Description: "A comprehensive 5-session retainer pack designed for growing businesses needing ongoing expert guidance and strategic counseling.",
          Unit: "Package",
          SessionsCount: 5,
          CostPrice: 1200.00,
          RetailPriceVat: 1850.00,
          Category: "Consulting",
          IsAvailable: true,
          SalesTags: "bestseller,popular",
          SortOrder: 1
        }
      },
      {
        fields: {
          Title: "Deep Dive Strategy Sprint",
          Sku: 10002,
          Description: "An intensive single-session crash course to audit your current business model and provide immediate actionable feedback.",
          Unit: "session",
          SessionsCount: 1,
          CostPrice: 350.00,
          RetailPriceVat: 500.00,
          Category: "Audits",
          IsAvailable: true,
          SalesTags: "new",
          SortOrder: 2
        }
      },
      {
        fields: {
          Title: "Enterprise Masters Course",
          Sku: 10003,
          Description: "A rigorous 10-module comprehensive course designed to completely revamp corporate strategies over a 3-month timeline.",
          Unit: "Course",
          SessionsCount: 10,
          CostPrice: 3000.00,
          RetailPriceVat: 4500.00,
          Category: "Education",
          IsAvailable: true,
          Discount: 500,
          DiscountType: "fixed",
          SalesTags: "premium",
          SortOrder: 3
        }
      }
    ];

    for (const prod of seedProducts) {
      await graphPost(`/sites/${siteId}/lists/${listId}/items`, prod);
      console.log(`Seeded product: ${prod.fields.Title}`);
    }

    console.log("✅ Provisioning complete! Real data is now sitting in the cloud.");

  } catch (error) {
    console.error("Execution failed:", error);
  }
}

run();
