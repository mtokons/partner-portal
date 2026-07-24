/**
 * create-three-b2b-viewers.mjs
 * Creates three B2B project partner viewer accounts for EduKraft:
 *   1. INTEGRATION       (integration@mysccg.de / Portal1!)
 *   2. GOPA GmbH         (gopa@mysccg.de / Portal1!)
 *   3. ICON-INSTITUT GmbH (icon@mysccg.de / Portal1!)
 * Scoped to EduKraft Org (OrgId: "1") and automatically mapped to GIZ Bangladesh PRECISE & TVET4RE.
 * Run: node scripts/create-three-b2b-viewers.mjs
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

const ORG_ID = "1"; // EduKraft
const ORG_NAME = "EduKraft";

const USERS = [
  { email: "integration@mysccg.de", password: "Portal1!", displayName: "INTEGRATION" },
  { email: "gopa@mysccg.de", password: "Portal1!", displayName: "GOPA GmbH" },
  { email: "icon@mysccg.de", password: "Portal1!", displayName: "ICON-INSTITUT GmbH" },
];

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET
  },
});

async function graph(method, url, body) {
  const t = (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken;
  const h = { Authorization: `Bearer ${t}` };
  if (body) h["Content-Type"] = "application/json";
  const r = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { if (r.status === 404) return null; throw new Error(`${r.status}: ${await r.text()}`); }
  return r.status !== 204 ? r.json() : null;
}

async function siteId() {
  const u = new URL(process.env.SHAREPOINT_SITE_URL);
  let p = u.pathname.replace(/\/+$/, "");
  if (!p.startsWith("/")) p = "/" + p;
  return (await graph("GET", `/sites/${u.hostname}:${p}`)).id;
}

async function run() {
  const sid = await siteId();
  const now = new Date().toISOString();

  console.log("Starting provisioning...");

  // Load all user profiles and roles in memory to filter locally
  const profilesRes = await graph("GET", `/sites/${sid}/lists/UserProfiles/items?$expand=fields&$top=500`);
  const allProfiles = profilesRes?.value || [];

  const rolesRes = await graph("GET", `/sites/${sid}/lists/UserRoles/items?$expand=fields&$top=500`);
  const allRoles = rolesRes?.value || [];

  for (const u of USERS) {
    const emailNorm = u.email.toLowerCase().trim();
    let uid;
    
    // 1. Firebase Auth
    try {
      const existing = await auth.getUserByEmail(emailNorm);
      uid = existing.uid;
      await auth.updateUser(uid, { password: u.password, emailVerified: true });
      console.log(`✓ Firebase Auth account updated for ${emailNorm}`);
    } catch (e) {
      const created = await auth.createUser({
        email: emailNorm,
        password: u.password,
        displayName: u.displayName,
        emailVerified: true
      });
      uid = created.uid;
      console.log(`+ Firebase Auth account created for ${emailNorm}`);
    }

    // 2. Firebase Firestore profile
    await db.collection("users").doc(uid).set({
      uid,
      email: emailNorm,
      displayName: u.displayName,
      role: "project-partner",
      roles: ["project-partner"],
      orgId: ORG_ID,
      orgName: ORG_NAME,
      status: "active",
      emailVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`✓ Firestore user profile set for ${u.displayName}`);

    // 3. SharePoint UserProfiles list
    let profileItem = allProfiles.find(p => p.fields.Email?.toLowerCase().trim() === emailNorm);
    if (!profileItem) {
      profileItem = await graph("POST", `/sites/${sid}/lists/UserProfiles/items`, {
        fields: {
          Title: u.displayName,
          Email: emailNorm,
          Role: "project-partner",
          Company: ORG_NAME,
          Status: "active",
          FirebaseUid: uid,
          CreatedAt: now,
          UpdatedAt: now
        }
      });
      console.log(`+ SharePoint UserProfiles item created for ${u.displayName}`);
    } else {
      await graph("PATCH", `/sites/${sid}/lists/UserProfiles/items/${profileItem.id}/fields`, {
        Title: u.displayName,
        Role: "project-partner",
        Company: ORG_NAME,
        Status: "active",
        FirebaseUid: uid,
        UpdatedAt: now
      });
      console.log(`✓ SharePoint UserProfiles item updated for ${u.displayName}`);
    }

    // 4. SharePoint UserRoles list
    let roleItem = allRoles.find(r => r.fields.UserAccountId === uid && r.fields.Role === "project-partner");
    if (!roleItem) {
      await graph("POST", `/sites/${sid}/lists/UserRoles/items`, {
        fields: {
          UserAccountId: uid,
          Role: "project-partner",
          Status: "active",
          GrantedAt: now,
          GrantedBy: "admin"
        }
      });
      console.log(`+ SharePoint UserRoles item created for ${u.displayName}`);
    } else {
      await graph("PATCH", `/sites/${sid}/lists/UserRoles/items/${roleItem.id}/fields`, {
        Status: "active",
        GrantedAt: now,
        GrantedBy: "admin"
      });
      console.log(`✓ SharePoint UserRoles item updated for ${u.displayName}`);
    }

    console.log(`Successfully provisioned ${u.displayName}.\n`);
  }

  console.log("All 3 project partner viewer accounts have been successfully provisioned.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
