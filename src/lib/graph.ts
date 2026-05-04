import type { Client } from "@microsoft/microsoft-graph-client";

let graphClient: Client | null = null;

function isGraphDebugEnabled(): boolean {
  return process.env.SP_GRAPH_DEBUG === "true";
}

function debugLog(...args: any[]) {
  if (!isGraphDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[Graph]", ...args);
}

function summarizeGraphError(err: any): Record<string, unknown> {
  const out: Record<string, unknown> = {
    message: err?.message,
    code: err?.code,
    statusCode: err?.statusCode,
    requestId: err?.requestId,
  };
  // microsoft-graph-client errors sometimes include a body object
  if (err?.body) out.body = err.body;
  return out;
}

export async function getGraphClient(): Promise<Client> {
  if (graphClient) return graphClient;

  // Dynamically import server-only packages to avoid bundling them into client code
  const [{ ConfidentialClientApplication }] = await Promise.all([
    // @azure/msal-node is server-only and pulls in 'fs' etc. Load at runtime.
    import("@azure/msal-node"),
  ]);
  const { Client: GraphClient } = await import("@microsoft/microsoft-graph-client");

  if (!process.env.AZURE_AD_CLIENT_ID || !process.env.AZURE_AD_TENANT_ID || !process.env.AZURE_AD_CLIENT_SECRET) {
    throw new Error("MICROSOFT_GRAPH_CONFIG_MISSING");
  }

  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_AD_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    },
  };

  const cca = new ConfidentialClientApplication(msalConfig);

  graphClient = GraphClient.init({
    authProvider: async (done) => {
      try {
        const result = await cca.acquireTokenByClientCredential({
          scopes: ["https://graph.microsoft.com/.default"],
        });
        done(null, result?.accessToken || "");
      } catch (err) {
        done(err as Error, "");
      }
    },
  }) as unknown as Client;

  return graphClient;
}

export async function graphGet<T>(url: string): Promise<T> {
  const client = await getGraphClient();
  // Allow filter/orderby on non-indexed columns (e.g. CreatedAt) — required for many of our lists.
  if (isGraphDebugEnabled()) debugLog("GET", url);
  try {
    return await client.api(url).header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly").get();
  } catch (err: any) {
    if (isGraphDebugEnabled()) debugLog("GET_ERROR", url, summarizeGraphError(err));
    throw err;
  }
}

/**
 * Executes a GET request but returns null instead of throwing on 404 (Not Found).
 * Critical for preventing server crashes when SharePoint lists are missing.
 */
export async function graphGetSafe<T>(url: string): Promise<T | null> {
  try {
    const client = await getGraphClient();
    if (isGraphDebugEnabled()) debugLog("GET_SAFE", url);
    return await client.api(url).header("Prefer", "HonorNonIndexedQueriesWarningMayFailRandomly").get();
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === "itemNotFound") {
      return null;
    }
    if (isGraphDebugEnabled()) debugLog("GET_SAFE_ERROR", url, summarizeGraphError(err));
    throw err;
  }
}

export async function graphPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const client = await getGraphClient();
  if (isGraphDebugEnabled()) debugLog("POST", url, body);
  try {
    return await client.api(url).post(body);
  } catch (err: any) {
    if (isGraphDebugEnabled()) debugLog("POST_ERROR", url, summarizeGraphError(err));
    throw err;
  }
}

export async function graphPatch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const client = await getGraphClient();
  if (isGraphDebugEnabled()) debugLog("PATCH", url, body);
  try {
    return await client.api(url).patch(body);
  } catch (err: any) {
    if (isGraphDebugEnabled()) debugLog("PATCH_ERROR", url, summarizeGraphError(err));
    throw err;
  }
}

export async function graphDelete(url: string): Promise<void> {
  const client = await getGraphClient();
  if (isGraphDebugEnabled()) debugLog("DELETE", url);
  try {
    await client.api(url).delete();
  } catch (err: any) {
    if (isGraphDebugEnabled()) debugLog("DELETE_ERROR", url, summarizeGraphError(err));
    throw err;
  }
}

export function getSiteListUrl(listName: string): string {
  // kept for backward-compat; use async version below when runtime resolution is needed
  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (!siteId) throw new Error("SHAREPOINT_SITE_ID is not set; call resolveSiteId() or use getSiteListUrlAsync()");
  return `/sites/${siteId}/lists/${listName}/items`;
}

let cachedSiteId: string | null = process.env.SHAREPOINT_SITE_ID ?? null;

export async function resolveSiteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId;
  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) throw new Error("Neither SHAREPOINT_SITE_ID nor SHAREPOINT_SITE_URL is set. Set one to allow Graph site resolution.");

  const u = new URL(siteUrl);
  const hostname = u.hostname; // e.g. mtokons.sharepoint.com
  const pathname = u.pathname || "/";

  // Attempt to extract a SharePoint site-relative path (starts with /sites/ or /teams/)
  const idxSites = pathname.indexOf("/sites/");
  const idxTeams = pathname.indexOf("/teams/");
  let sitePath = "/";
  if (idxSites !== -1) sitePath = pathname.slice(idxSites);
  else if (idxTeams !== -1) sitePath = pathname.slice(idxTeams);
  else sitePath = pathname;

  // Trim any page-specific segments (e.g. /SitePages/Home.aspx)
  const cutAt = sitePath.search(/\/SitePages|\/Lists|\/_layouts|\/Pages/);
  if (cutAt !== -1) sitePath = sitePath.slice(0, cutAt);
  sitePath = sitePath.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;

  const graphPath = `/sites/${hostname}:${sitePath}`;
  const site = await graphGet<{ id: string }>(graphPath);
  if (!site || !site.id) throw new Error(`Unable to resolve SharePoint site for ${siteUrl}`);
  cachedSiteId = site.id;
  // also set env for any code that reads it synchronously
  try { process.env.SHAREPOINT_SITE_ID = cachedSiteId; } catch (_) {}
  return cachedSiteId;
}

export async function getSiteListUrlAsync(listName: string): Promise<string> {
  const siteId = await resolveSiteId();
  return `/sites/${siteId}/lists/${listName}/items`;
}

/**
 * Escape a user-controlled string for use inside an OData $filter literal.
 * OData single-quote literals escape ' as ''. Also strips control chars to
 * prevent header smuggling / log injection.
 */
export function escapeOData(value: string): string {
  return String(value).replace(/[\x00-\x1f\x7f]/g, "").replace(/'/g, "''");
}
