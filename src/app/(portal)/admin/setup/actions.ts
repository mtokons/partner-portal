"use server";

import { auth } from "@/auth";
import { resolveSiteId, graphGet, graphPost, graphPatch } from "@/lib/graph";
import { revalidatePath } from "next/cache";

/**
 * List definition for SharePoint Infrastructure Setup.
 */
interface ListSchema {
  name: string;
  displayName: string;
  columns: Array<{
    name: string;
    type: "text" | "number" | "dateTime" | "boolean" | "currency" | "note";
  }>;
}

const PORTAL_SCHEMA: ListSchema[] = [
  {
    name: "Partners",
    displayName: "SCCG Partners",
    columns: [
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "PasswordHash", type: "text" },
      { name: "Role", type: "text" },
      { name: "Status", type: "text" },
      { name: "Company", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Products",
    displayName: "SCCG Products",
    columns: [
      { name: "Sku", type: "text" },
      { name: "Unit", type: "text" },
      { name: "SessionsCount", type: "number" },
      { name: "RetailPriceEur", type: "currency" },
      { name: "RetailPriceBdt", type: "currency" },
      { name: "Category", type: "text" },
      { name: "Price", type: "currency" },
      { name: "Description", type: "note" },
      { name: "Stock", type: "number" },
      { name: "ImageUrl", type: "text" },
      { name: "IsAvailable", type: "boolean" },
      { name: "SalesTags", type: "text" },
      { name: "SortOrder", type: "number" },
    ],
  },
  {
    name: "Orders",
    displayName: "SCCG Orders",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "Items", type: "note" },
      { name: "Status", type: "text" },
      { name: "TotalAmount", type: "currency" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Clients",
    displayName: "SCCG Clients",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Name", type: "text" },
      { name: "Email", type: "text" },
      { name: "Phone", type: "text" },
      { name: "Company", type: "text" },
      { name: "Address", type: "note" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Activities",
    displayName: "SCCG Activities",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "Type", type: "text" },
      { name: "Description", type: "note" },
      { name: "RelatedId", type: "text" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "Invoices",
    displayName: "SCCG Invoices",
    columns: [
      { name: "PartnerId", type: "text" },
      { name: "ClientId", type: "text" },
      { name: "ClientName", type: "text" },
      { name: "OrderId", type: "text" },
      { name: "Amount", type: "currency" },
      { name: "Status", type: "text" },
      { name: "DueDate", type: "dateTime" },
      { name: "CreatedAt", type: "dateTime" },
    ],
  },
  {
    name: "CoinWallets",
    displayName: "SCCG Coin Wallets",
    columns: [
      { name: "UserId", type: "text" },
      { name: "Balance", type: "number" },
      { name: "TotalSpent", type: "number" },
      { name: "LastUpdated", type: "dateTime" },
    ],
  },
  {
    name: "GiftCards",
    displayName: "SCCG Gift Cards",
    columns: [
      { name: "SccgId", type: "text" },
      { name: "CardNumber", type: "text" },
      { name: "PinHash", type: "text" },
      { name: "Status", type: "text" },
      { name: "Balance", type: "number" },
      { name: "IssuedToName", type: "text" },
      { name: "IssuedAt", type: "dateTime" },
    ],
  },
];

export async function checkInfrastructureAction() {
  const session = await auth();
  const user = session?.user as any; 
  if (user?.role !== "admin") throw new Error("Unauthorized");

  const siteId = await resolveSiteId();
  const res = await graphGet<{ value: any[] }>(`/sites/${siteId}/lists`);
  const existingLists = res.value.map((l) => l.name);

  return PORTAL_SCHEMA.map((s) => ({
    ...s,
    exists: existingLists.includes(s.name) || existingLists.includes(s.displayName),
  }));
}

export async function initializeInfrastructureAction() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "admin") throw new Error("Unauthorized");

  const siteId = await resolveSiteId();
  const results = [];

  for (const schema of PORTAL_SCHEMA) {
    try {
      // 1. Create List
      const listRes = await graphPost<any>(`/sites/${siteId}/lists`, {
        displayName: schema.displayName,
        list: { template: "genericList" },
      });
      const listId = listRes.id;

      // 2. Add Columns
      for (const col of schema.columns) {
        if (col.name === "Title") continue; // Title exists by default
        await graphPost(`/sites/${siteId}/lists/${listId}/columns`, {
          name: col.name,
          displayName: col.name,
          [col.type]: {},
        });
      }
      results.push({ name: schema.name, status: "created" });
    } catch (err: any) {
      results.push({ name: schema.name, status: "error", error: err.message });
    }
  }

  revalidatePath("/admin/setup");
  return results;
}

export async function seedProductsAction() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== "admin") throw new Error("Unauthorized");
  
  const { mockProducts } = await import("@/lib/mock-data");
  const { createProduct } = await import("@/lib/sharepoint");

  for (const p of mockProducts) {
    await createProduct(p);
  }
  
  return { success: true, count: mockProducts.length };
}
