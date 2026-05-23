/**
 * Unified Repository — single import point for all data access.
 *
 * Usage: import { db } from "@/lib/db";
 *        const partners = await db.partners.getAll();
 */
export * as partners from "./repositories/partners";
export * as clients from "./repositories/clients";
export * as products from "./repositories/products";
export * as sales from "./repositories/sales";
export * as financials from "./repositories/financials";
