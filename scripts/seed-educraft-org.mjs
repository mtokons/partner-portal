/**
 * seed-educraft-org.mjs
 * Seeds a full Project Partner Management System demo for the "Educraft" org:
 *   - ProjectOrg "Educraft"
 *   - Org admin login   admin.educraft@mysccg.de  / Portal1!  (project-partner-admin)
 *   - Viewer login      viewer.educraft@mysccg.de / Portal1!  (project-partner, read-only)
 *   - A joint-venture Project linked to the org
 *   - A targeted CV form template + an evaluation matrix template for that project
 * Requires lists provisioned via scripts/setup-ppms-lists.mjs first.
 * Run: node scripts/seed-educraft-org.mjs
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

const ORG_NAME = "Educraft";
const ADMIN = { email: "admin.educraft@mysccg.de", password: "Portal1!", displayName: "Educraft Admin" };
const VIEWER = { email: "viewer.educraft@mysccg.de", password: "Portal1!", displayName: "Educraft Viewer" };

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

async function ensureUser(profile, role, orgId, orgName) {
  let uid;
  try { uid = (await auth.getUserByEmail(profile.email)).uid; await auth.updateUser(uid, { password: profile.password, emailVerified: true }); }
  catch { uid = (await auth.createUser({ email: profile.email, password: profile.password, displayName: profile.displayName, emailVerified: true })).uid; }
  await db.collection("users").doc(uid).set({
    uid, email: profile.email, displayName: profile.displayName, role, roles: [role],
    orgId, orgName, status: "active", emailVerified: true,
    updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return uid;
}

async function run() {
  const sid = await siteId();
  const now = new Date().toISOString();

  // 1. ProjectOrg
  const orgItems = await graph("GET", `/sites/${sid}/lists/ProjectOrgs/items?$expand=fields&$top=200`);
  let org = (orgItems?.value || []).find((i) => i.fields?.Title === ORG_NAME);
  if (!org) {
    org = await graph("POST", `/sites/${sid}/lists/ProjectOrgs/items`, { fields: {
      Title: ORG_NAME, AdminEmails: ADMIN.email, PrimaryColor: "#0ea5e9", Status: "active",
      Notes: "Joint-venture partner organisation.", CreatedAt: now,
    }});
    console.log("+ ProjectOrg created");
  } else console.log("✓ ProjectOrg exists");
  const orgId = org.id;

  // 2. Users
  await ensureUser(ADMIN, "project-partner-admin", orgId, ORG_NAME);
  await ensureUser(VIEWER, "project-partner", orgId, ORG_NAME);
  console.log("+ Admin + viewer users ready");

  // 3. Joint-venture project linked to the org
  const projItems = await graph("GET", `/sites/${sid}/lists/Projects/items?$expand=fields&$top=300`);
  let project = (projItems?.value || []).find((i) => i.fields?.Code === "EDU-JV1");
  if (!project) {
    project = await graph("POST", `/sites/${sid}/lists/Projects/items`, { fields: {
      Title: "Educraft JV – Skills Programme", Code: "EDU-JV1", Client: "Joint Venture",
      PartnerName: ORG_NAME, PartnerEmail: ADMIN.email, OrgId: orgId,
      Description: "Joint-venture skills-development project sourcing experts from the SCCG panel.",
      Status: "active", CreatedAt: now,
    }});
    console.log("+ JV project created");
  } else console.log("✓ JV project exists");
  const projectId = project.id;

  // 4. CV form template
  const formFields = [
    { key: "fullName", label: "Full name", type: "text", hint: "Candidate's full name" },
    { key: "yearsExperience", label: "Years of experience", type: "number", hint: "Total relevant years" },
    { key: "education", label: "Highest qualification", type: "text" },
    { key: "keySkills", label: "Key skills", type: "textarea", hint: "Comma-separated core competencies" },
    { key: "languages", label: "Languages", type: "text" },
  ];
  const formItems = await graph("GET", `/sites/${sid}/lists/CvFormTemplates/items?$expand=fields&$top=200`);
  let form = (formItems?.value || []).find((i) => i.fields?.ProjectId === projectId);
  if (!form) {
    form = await graph("POST", `/sites/${sid}/lists/CvFormTemplates/items`, { fields: {
      Title: "Educraft JV CV form", ProjectId: projectId, FieldsJson: JSON.stringify(formFields), CreatedAt: now,
    }});
    console.log("+ CV form template created");
  } else console.log("✓ CV form template exists");

  // 5. Evaluation matrix template
  const criteria = [
    { key: "education", category: "Education/Training", label: "Relevant university degree", maxPoints: 2 },
    { key: "experience", category: "General Prof. Experience", label: "5+ years in the sector", maxPoints: 4 },
    { key: "specific", category: "Specific Prof. Experience", label: "Skills-programme delivery experience", maxPoints: 3 },
    { key: "language", category: "Language", label: "English proficiency", maxPoints: 1 },
  ];
  const evalItems = await graph("GET", `/sites/${sid}/lists/EvaluationTemplates/items?$expand=fields&$top=200`);
  let evalTpl = (evalItems?.value || []).find((i) => i.fields?.ProjectId === projectId);
  if (!evalTpl) {
    evalTpl = await graph("POST", `/sites/${sid}/lists/EvaluationTemplates/items`, { fields: {
      Title: "Educraft JV matrix", ProjectId: projectId, EvalKey: "edu-jv1", MinPercent: 70,
      CriteriaJson: JSON.stringify(criteria), CreatedAt: now,
    }});
    console.log("+ Evaluation template created");
  } else console.log("✓ Evaluation template exists");

  // 6. Link templates onto the project
  await graph("PATCH", `/sites/${sid}/lists/Projects/items/${projectId}/fields`, {
    CvFormTemplateId: form.id, EvaluationTemplateId: evalTpl.id, UpdatedAt: now,
  });
  console.log("+ Project linked to form + matrix");

  console.log("\n══ EDUCRAFT PPMS DEMO ══");
  console.log(`Org admin : ${ADMIN.email}  / ${ADMIN.password}  (full CRUD)`);
  console.log(`Viewer    : ${VIEWER.email} / ${VIEWER.password}  (read-only)`);
  console.log(`Login     : https://portal.mysccg.de/login`);
}
run().catch((e) => { console.error(e); process.exit(1); });
