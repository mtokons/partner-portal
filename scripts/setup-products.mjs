import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';

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
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  if (!site) throw new Error("Could not resolve site ID");
  return site.id;
}

async function run() {
  try {
    console.log("Resolving SharePoint Site ID...");
    const siteId = await resolveSiteId();
    console.log(`Site ID resolved: ${siteId}`);

    // Idempotent: reuse existing Products list if present, only seed if empty.
    const force = process.argv.includes("--force");
    console.log("Checking for existing 'Products' list...");
    const existingLists = await graphRequest("GET", `/sites/${siteId}/lists`);
    const oldList = existingLists.value.find(l => l.displayName === "Products");
    let listId;
    if (oldList) {
      if (force) {
        console.log(`--force passed: deleting existing list (ID: ${oldList.id})...`);
        await graphRequest("DELETE", `/sites/${siteId}/lists/${oldList.id}`);
      } else {
        listId = oldList.id;
        console.log(`Reusing existing list (ID: ${listId}). Skipping schema recreation.`);
        // Skip seeding if items already exist
        const existingItems = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/items?$top=1`);
        if (existingItems?.value?.length) {
          console.log("Products list already has items — skipping seed. Re-run with --force to wipe and reseed.");
          return;
        }
        console.log("Products list is empty — proceeding to seed.");
      }
    }

    if (!listId) {
    console.log("Creating fresh Products list with new schema...");
    const listBody = {
      displayName: "Products",
      columns: [
        { name: "Sku", text: {} },
        { name: "Description", text: { allowMultipleLines: true } },
        { name: "Unit", choice: { choices: ["Package", "Session", "Course"] } },
        { name: "SessionsCount", number: {} },
        { name: "RetailPriceEur", currency: { locale: "de-DE" } },
        { name: "RetailPriceBdt", currency: { locale: "en-US" } },
        { name: "CostPrice", currency: { locale: "en-US" } },
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

    const newList = await graphRequest("POST", `/sites/${siteId}/lists`, listBody);
    listId = newList.id;
    console.log(`Created new list 'Products' with ID: ${listId}`);
    } // end if (!listId)

    console.log("Seeding 17 physical SCCG real products...");

    const seedProducts = [
      { Title: "Ausbildung All-in-One", Sku: "SCCG-AIO-AUSB", Description: "Language (A1-B1), ZAB verification, Profile Assessment, Job Training, and Offer Letter.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1998, RetailPriceBdt: 282237, Category: "Ausbildung", IsAvailable: true, SortOrder: 1 },
      { Title: "Student Visa All-in-One", Sku: "SCCG-AIO-STUD", Description: "Profile Assessment, Uni-Assist fee, application prep, and university offer letter.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1390, RetailPriceBdt: 196351, Category: "Student Visa", IsAvailable: true, SortOrder: 2 },
      { Title: "Opp. Card All-in-One", Sku: "SCCG-AIO-OPP", Description: "A1 Language, ZAB verification, Profile Assessment, and Job Searching training.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1460, RetailPriceBdt: 206240, Category: "Opportunity Card", IsAvailable: true, SortOrder: 3 },
      { Title: "Student Starter Plan", Sku: "SCCG-TR-START", Description: "Profile Assessment, CV/Motivation letter feedback, and career development plan.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 25, RetailPriceBdt: 3500, Category: "Plans", IsAvailable: true, SortOrder: 4 },
      { Title: "Eligibility Assessment", Sku: "SCCG-TR-ELG", Description: "Profile evaluation and basic feedback on CV/Cover letter for German careers.", Unit: "Session", SessionsCount: 1, RetailPriceEur: 35, RetailPriceBdt: 5000, Category: "Assessment", IsAvailable: true, SortOrder: 5 },
      { Title: "Student Standard Plan", Sku: "SCCG-TR-STAND", Description: "CV/SOP prep, university selection, application follow-up, and scholarship info.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 177, RetailPriceBdt: 25000, Category: "Plans", IsAvailable: true, SortOrder: 6 },
      { Title: "Student Premium Plan", Sku: "SCCG-TR-PREM", Description: "All Standard Plan benefits plus visa support, interview prep, and relocation.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 283, RetailPriceBdt: 40000, Category: "Plans", IsAvailable: true, SortOrder: 7 },
      { Title: "Advanced Career Coaching", Sku: "SCCG-TR-COACH", Description: "CV/Cover letter design, LinkedIn optimization, and 5 interview/performance sessions.", Unit: "Session", SessionsCount: 5, RetailPriceEur: 177, RetailPriceBdt: 25000, Category: "Coaching", IsAvailable: true, SortOrder: 8 },
      { Title: "Opportunity Card Prep", Sku: "SCCG-TR-OPP1", Description: "Expert-led preparation for the Opportunity Card application process.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 248, RetailPriceBdt: 35000, Category: "Opportunity Card", IsAvailable: true, SortOrder: 9 },
      { Title: "Opp. Card + Visa", Sku: "SCCG-TR-OPP2", Description: "Full Opportunity Card application preparation and professional visa assistance.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 425, RetailPriceBdt: 60000, Category: "Opportunity Card", IsAvailable: true, SortOrder: 10 },
      { Title: "Ausbildung Job Training", Sku: "SCCG-TR-AUSB1", Description: "Specialized coaching for searching and securing Ausbildung positions in Germany.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 177, RetailPriceBdt: 25000, Category: "Ausbildung", IsAvailable: true, SortOrder: 11 },
      { Title: "Ausbildung + Visa", Sku: "SCCG-TR-AUSB2", Description: "Ausbildung job searching training combined with full visa assistance.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 283, RetailPriceBdt: 40000, Category: "Ausbildung", IsAvailable: true, SortOrder: 12 },
      { Title: "German A1", Sku: "SCCG-LAN-A1", Description: "Standard A1 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 91, RetailPriceBdt: 12900, Category: "Language", IsAvailable: true, SortOrder: 13 },
      { Title: "German A2", Sku: "SCCG-LAN-A2", Description: "Standard A2 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 98, RetailPriceBdt: 13900, Category: "Language", IsAvailable: true, SortOrder: 14 },
      { Title: "German B1", Sku: "SCCG-LAN-B1", Description: "Standard B1 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Language", IsAvailable: true, SortOrder: 15 },
      { Title: "Intensive A1-A2", Sku: "SCCG-LAN-IA2", Description: "Intensive dual-level German language program from A1 through A2.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 177, RetailPriceBdt: 25000, Category: "Language", IsAvailable: true, SortOrder: 16 },
      { Title: "Intensive A1-B1", Sku: "SCCG-LAN-IB1", Description: "Intensive triple-level German language program from A1 through B1.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 282, RetailPriceBdt: 39800, Category: "Language", IsAvailable: true, SortOrder: 17 }
    ];

    for (const prod of seedProducts) {
      await graphRequest("POST", `/sites/${siteId}/lists/${listId}/items`, { fields: prod });
      console.log(`Seeded: ${prod.Sku} - ${prod.Title}`);
    }

    console.log("✅ All 17 live products perfectly seeded to correct schema!");

  } catch (error) {
    console.error("Execution failed:", error);
  }
}

run();
