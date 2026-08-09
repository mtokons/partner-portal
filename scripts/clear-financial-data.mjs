/**
 * Purge and Reset All Financial & Sales Data for Test Phase 2
 *
 * Clears all sales orders, sales offers, invoices, payment transactions, expenses,
 * payouts, expert payments, installments, ledgers, and resets candidate revenue share fields.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync, existsSync } from "fs";

// Load environment variables
function loadEnv(file) {
  if (!existsSync(file)) return;
  const envFile = readFileSync(file, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
}
loadEnv(".env.local");
loadEnv("import.env");

if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
  console.error("❌ Missing Azure AD configuration in environment.");
  process.exit(1);
}

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
  const headers = { Authorization: `Bearer ${token}` };
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
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL not set");
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function getListId(siteId, listDisplayName) {
  try {
    const res = await graphRequest("GET", `/sites/${siteId}/lists/${listDisplayName}`);
    return res.id;
  } catch (err) {
    if (err.message.includes("404")) return null;
    throw err;
  }
}

async function clearList(siteId, listDisplayName) {
  const listId = await getListId(siteId, listDisplayName);
  if (!listId) {
    console.log(`ℹ️ List '${listDisplayName}' not found or already empty.`);
    return 0;
  }
  const itemsRes = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/items?$top=999`);
  const items = itemsRes.value || [];
  if (items.length === 0) {
    console.log(`✓ List '${listDisplayName}' is empty (0 items).`);
    return 0;
  }
  console.log(`🗑️ Clearing ${items.length} items from '${listDisplayName}'...`);
  let count = 0;
  for (const item of items) {
    try {
      await graphRequest("DELETE", `/sites/${siteId}/lists/${listId}/items/${item.id}`);
      count++;
    } catch (e) {
      console.warn(`   Failed to delete item ${item.id} from ${listDisplayName}:`, e.message);
    }
  }
  console.log(`✅ Cleared ${count}/${items.length} items from '${listDisplayName}'.`);
  return count;
}

async function resetCandidateShares(siteId) {
  const listId = await getListId(siteId, "Candidates");
  if (!listId) return 0;
  const itemsRes = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=999`);
  const items = itemsRes.value || [];
  console.log(`🔄 Resetting financial share fields on ${items.length} Candidates...`);
  let count = 0;
  for (const item of items) {
    try {
      await graphRequest("PATCH", `/sites/${siteId}/lists/${listId}/items/${item.id}/fields`, {
        SccgShare: 0,
        PartnerShare: 0,
        PaidAmount: 0,
        DueAmount: 0,
        TotalFee: 0,
      });
      count++;
    } catch (e) {
      // Ignore missing column errors on tenant
    }
  }
  console.log(`✅ Reset candidate revenue shares on ${count} candidate records.`);
  return count;
}

async function resetWallets(siteId) {
  const listId = await getListId(siteId, "CoinWallets");
  if (!listId) return 0;
  const itemsRes = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=999`);
  const items = itemsRes.value || [];
  console.log(`🪙 Resetting wallet balances on ${items.length} CoinWallets...`);
  let count = 0;
  for (const item of items) {
    try {
      await graphRequest("PATCH", `/sites/${siteId}/lists/${listId}/items/${item.id}/fields`, {
        Balance: 0,
      });
      count++;
    } catch (e) {}
  }
  console.log(`✅ Reset balance to 0 on ${count} CoinWallets.`);
  return count;
}

async function main() {
  console.log("🚀 Starting Financial & Sales Data Reset for Test Phase 2...\n");
  const siteId = await resolveSiteId();
  console.log(`Connected to SharePoint Site ID: ${siteId}\n`);

  const listsToClear = [
    "Financials",
    "SalesOrders",
    "SalesOrderItems",
    "SalesOffers",
    "SalesOfferItems",
    "Orders",
    "Invoices",
    "Transactions",
    "Installments",
    "Expenses",
    "Payouts",
    "ExpertPayments",
    "CommissionLedger",
    "CoinTransactions",
    "GiftCardTransactions",
    "SccgCardTransactions",
    "OfferAcceptanceLog",
    "PromoCodeUsages",
  ];

  let totalDeleted = 0;
  for (const listName of listsToClear) {
    const deleted = await clearList(siteId, listName);
    totalDeleted += deleted;
  }

  await resetCandidateShares(siteId);
  await resetWallets(siteId);

  console.log(`\n🎉 Reset Complete! Deleted ${totalDeleted} financial & sales items across all SharePoint lists.`);
}

main().catch((err) => {
  console.error("❌ Reset script failed:", err);
  process.exit(1);
});
