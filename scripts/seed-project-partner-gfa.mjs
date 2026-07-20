/**
 * seed-project-partner-gfa.mjs
 * Creates the GFA Project Partner login + the "GIZ Bangladesh TVET4RE" project.
 * Requires lists provisioned via scripts/setup-projects-lists.mjs first.
 * Run: node scripts/seed-project-partner-gfa.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.FIREBASE_CLIENT_EMAIL) dotenv.config({ path: ".env.production" });

const sa = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ""),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ""),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, "")?.replace(/\\n/g, "\n"),
};
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const auth = getAuth();

const PARTNER = { email: "gfa.partner@mysccg.de", password: "Portal1!", displayName: "GFA Consulting Group", company: "GFA" };

const cca = new ConfidentialClientApplication({
  auth: { clientId: process.env.AZURE_AD_CLIENT_ID, authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`, clientSecret: process.env.AZURE_AD_CLIENT_SECRET },
});
async function graph(method, url, body) {
  const t = (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken;
  const h = { Authorization: `Bearer ${t}` }; if (body) h["Content-Type"] = "application/json";
  const r = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { if (r.status === 404) return null; throw new Error(`${r.status}: ${await r.text()}`); }
  return r.status !== 204 ? r.json() : null;
}
async function siteId() {
  const u = new URL(process.env.SHAREPOINT_SITE_URL);
  let p = u.pathname.replace(/\/+$/, ""); if (!p.startsWith("/")) p = "/" + p;
  return (await graph("GET", `/sites/${u.hostname}:${p}`)).id;
}

async function run() {
  // 1. Firebase user
  let uid;
  try { uid = (await auth.getUserByEmail(PARTNER.email)).uid; await auth.updateUser(uid, { password: PARTNER.password, emailVerified: true }); }
  catch { uid = (await auth.createUser({ email: PARTNER.email, password: PARTNER.password, displayName: PARTNER.displayName, emailVerified: true })).uid; }
  await db.collection("users").doc(uid).set({
    uid, email: PARTNER.email, displayName: PARTNER.displayName, role: "project-partner", roles: ["project-partner"],
    company: PARTNER.company, status: "active", emailVerified: true, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 2. Project (skip if a project with same code already exists)
  const sid = await siteId();
  const existing = await graph("GET", `/sites/${sid}/lists/Projects/items?$expand=fields&$top=200`);
  const has = (existing?.value || []).some((i) => i.fields?.Code === "TVET4RE");
  if (!has) {
    await graph("POST", `/sites/${sid}/lists/Projects/items`, { fields: {
      Title: "GIZ Bangladesh TVET4RE", Code: "TVET4RE", Client: "GIZ Bangladesh", PartnerName: "GFA",
      PartnerEmail: PARTNER.email, Description: "Expert staffing collaboration for the GIZ Bangladesh TVET4RE programme.",
      Status: "active", CreatedAt: new Date().toISOString(),
    }});
    console.log("+ Project created");
  } else console.log("✓ Project exists");

  console.log("\n══ GFA PROJECT PARTNER ══");
  console.log(`Email: ${PARTNER.email}  Password: ${PARTNER.password}  Login: https://portal.mysccg.de/login`);
}
run().catch((e) => { console.error(e); process.exit(1); });
