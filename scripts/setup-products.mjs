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

    console.log("Seeding SCCG products with correct categories...");

    const seedProducts = [
      // ── Training & Language ──
      { Title: "Profile Assessment", Sku: "SCCG-TL-PA", Description: "Comprehensive profile evaluation and career development plan for German careers.", Unit: "Session", SessionsCount: 1, RetailPriceEur: 30, RetailPriceBdt: 4200, Category: "Training & Language", IsAvailable: true, SalesTags: "include:Profile evaluation,include:CV feedback,include:Career plan", SortOrder: 1 },
      { Title: "Advanced Job Application Training", Sku: "SCCG-TL-JAT", Description: "CV/Cover letter design, LinkedIn optimization, interview preparation, and job search strategy.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 190, RetailPriceBdt: 26800, Category: "Training & Language", IsAvailable: true, SalesTags: "include:CV & Cover letter design,include:LinkedIn optimization,include:Interview preparation,include:Job search strategy", SortOrder: 2 },
      { Title: "Advanced Student Preparation", Sku: "SCCG-TL-ASP", Description: "University application preparation, SOP writing, and admission strategy for German universities.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 190, RetailPriceBdt: 26800, Category: "Training & Language", IsAvailable: true, SalesTags: "include:SOP writing,include:University selection,include:Application preparation,include:Admission strategy", SortOrder: 3 },
      { Title: "German A1", Sku: "SCCG-LAN-A1", Description: "Standard A1 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 91, RetailPriceBdt: 12900, Category: "Training & Language", IsAvailable: true, SalesTags: "include:A1 course material,include:Live classes,include:Certificate", SortOrder: 4 },
      { Title: "German A2", Sku: "SCCG-LAN-A2", Description: "Standard A2 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 98, RetailPriceBdt: 13900, Category: "Training & Language", IsAvailable: true, SalesTags: "include:A2 course material,include:Live classes,include:Certificate", SortOrder: 5 },
      { Title: "German B1", Sku: "SCCG-LAN-B1", Description: "Standard B1 level German language course led by a language teacher.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Training & Language", IsAvailable: true, SalesTags: "include:B1 course material,include:Live classes,include:Certificate", SortOrder: 6 },
      { Title: "Intensive A1-A2", Sku: "SCCG-LAN-IA2", Description: "Intensive dual-level German language program from A1 through A2.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 177, RetailPriceBdt: 25000, Category: "Training & Language", IsAvailable: true, SalesTags: "include:A1 & A2 combined,include:Intensive schedule,include:Certificate", SortOrder: 7 },
      { Title: "Intensive A1-B1", Sku: "SCCG-LAN-IB1", Description: "Intensive triple-level German language program from A1 through B1.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 282, RetailPriceBdt: 39800, Category: "Training & Language", IsAvailable: true, SalesTags: "include:A1 to B1 combined,include:Intensive schedule,include:Certificate", SortOrder: 8 },
      { Title: "Intensive A1-B2", Sku: "SCCG-LAN-IB2", Description: "Full intensive German language program from A1 through B2.", Unit: "Course", SessionsCount: 1, RetailPriceEur: 450, RetailPriceBdt: 63500, Category: "Training & Language", IsAvailable: true, SalesTags: "include:A1 to B2 combined,include:Intensive schedule,include:Certificate", SortOrder: 9 },

      // ── Ausbildung ──
      { Title: "Ausbildung All Inclusive", Sku: "SCCG-AUS-AIO", Description: "Complete Ausbildung package: Language (A1-B1), ZAB verification, Profile Assessment, Job Training, and Offer Letter.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1998, RetailPriceBdt: 282237, Category: "Ausbildung", IsAvailable: true, SalesTags: "include:Language course (A1-B1),include:ZAB verification,include:Profile Assessment,include:Job Application Training,include:Offer Letter support", SortOrder: 10 },
      { Title: "Job Application Training", Sku: "SCCG-AUS-JAT", Description: "Specialized coaching for searching and securing Ausbildung positions in Germany.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 190, RetailPriceBdt: 26800, Category: "Ausbildung", IsAvailable: true, SalesTags: "include:CV & Cover letter,include:Job search strategy,include:Interview preparation", SortOrder: 11 },
      { Title: "Visa Support", Sku: "SCCG-AUS-VISA", Description: "Professional visa application assistance for Ausbildung candidates.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Ausbildung", IsAvailable: true, SalesTags: "include:Visa application guidance,include:Document checklist,include:Embassy appointment support", SortOrder: 12 },

      // ── Opportunity Card ──
      { Title: "Opportunity Card All Inclusive", Sku: "SCCG-OC-AIO", Description: "Complete Opportunity Card package: A1 Language, ZAB verification, Profile Assessment, and Job Searching training.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1460, RetailPriceBdt: 206240, Category: "Opportunity Card", IsAvailable: true, SalesTags: "include:A1 Language course,include:ZAB verification,include:Profile Assessment,include:Job search training", SortOrder: 13 },
      { Title: "Job Application Training", Sku: "SCCG-OC-JAT", Description: "Expert-led job application training for Opportunity Card holders.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 190, RetailPriceBdt: 26800, Category: "Opportunity Card", IsAvailable: true, SalesTags: "include:CV & Cover letter,include:Job search strategy,include:Interview preparation", SortOrder: 14 },
      { Title: "OC Application Submission", Sku: "SCCG-OC-APP", Description: "Full Opportunity Card application preparation and submission assistance.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 250, RetailPriceBdt: 35300, Category: "Opportunity Card", IsAvailable: true, SalesTags: "include:Application preparation,include:Document review,include:Submission support", SortOrder: 15 },
      { Title: "Visa Support", Sku: "SCCG-OC-VISA", Description: "Professional visa assistance for Opportunity Card applicants.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Opportunity Card", IsAvailable: true, SalesTags: "include:Visa application guidance,include:Document checklist,include:Embassy appointment support", SortOrder: 16 },

      // ── Student ──
      { Title: "Student All Inclusive", Sku: "SCCG-STU-AIO", Description: "Complete student package: Profile Assessment, Uni-Assist fee, application prep, and university offer letter.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 1390, RetailPriceBdt: 196351, Category: "Student", IsAvailable: true, SalesTags: "include:Profile Assessment,include:Uni-Assist fee,include:Application preparation,include:University offer letter", SortOrder: 17 },
      { Title: "Advanced Application Preparation", Sku: "SCCG-STU-AAP", Description: "CV/SOP prep, university selection, application follow-up, and scholarship information.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 190, RetailPriceBdt: 26800, Category: "Student", IsAvailable: true, SalesTags: "include:CV & SOP preparation,include:University selection,include:Application follow-up,include:Scholarship info", SortOrder: 18 },
      { Title: "Visa Support", Sku: "SCCG-STU-VISA", Description: "Professional visa application assistance for student visa applicants.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Student", IsAvailable: true, SalesTags: "include:Visa application guidance,include:Document checklist,include:Embassy appointment support", SortOrder: 19 },

      // ── Others ──
      { Title: "Translation Service", Sku: "SCCG-OTH-TRANS", Description: "Professional document translation service, priced per page.", Unit: "Session", SessionsCount: 1, RetailPriceEur: 30, RetailPriceBdt: 4200, Category: "Others", IsAvailable: true, SalesTags: "include:Per page translation,include:Certified translation,include:Official documents", SortOrder: 20 },
      { Title: "Visa Support", Sku: "SCCG-OTH-VISA", Description: "General visa application assistance for various visa categories.", Unit: "Package", SessionsCount: 1, RetailPriceEur: 120, RetailPriceBdt: 16900, Category: "Others", IsAvailable: true, SalesTags: "include:Visa application guidance,include:Document checklist,include:Embassy appointment support", SortOrder: 21 },
    ];

    for (const prod of seedProducts) {
      await graphRequest("POST", `/sites/${siteId}/lists/${listId}/items`, { fields: prod });
      console.log(`Seeded: ${prod.Sku} - ${prod.Title}`);
    }

    console.log(`✅ All ${seedProducts.length} products seeded with correct categories!`);

  } catch (error) {
    console.error("Execution failed:", error);
  }
}

run();
