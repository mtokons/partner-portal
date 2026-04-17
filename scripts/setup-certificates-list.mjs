import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';
import { readFileSync } from 'fs';

// Load variables from .env.local
try {
  const envFile = readFileSync('.env.local', 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
} catch (e) {}

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
  if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL not set");
  const { hostname, pathname } = new URL(siteUrl);
  let sitePath = pathname.replace(/\/+$/, "");
  if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  const site = await graphRequest("GET", `/sites/${hostname}:${sitePath}`);
  return site.id;
}

async function createListIfNotExists(siteId, listName, columns) {
  const existingLists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = existingLists.value.find(l => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists (ID: ${existing.id}).`);
    return existing.id;
  }

  console.log(`Creating list '${listName}'...`);
  const listBody = {
    displayName: listName,
    columns: columns,
    list: { template: "genericList" }
  };
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, listBody);
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
}

async function run() {
  try {
    const siteId = await resolveSiteId();
    console.log(`Site ID: ${siteId}`);

    // SchoolCertificates list
    await createListIfNotExists(siteId, "SchoolCertificates", [
      { name: "CertificateNumber", text: {} },
      { name: "CertificateType", choice: { choices: ["participation", "completion"] } },
      { name: "StudentName", text: {} },
      { name: "StudentEmail", text: {} },
      { name: "StudentUserId", text: {} },
      { name: "StudentSccgId", text: {} },
      { name: "CourseName", text: {} },
      { name: "CourseLevel", choice: { choices: ["A1", "A2", "B1", "B2", "C1", "C2"] } },
      { name: "BatchCode", text: {} },
      { name: "AttendancePercentage", number: {} },
      { name: "FinalGrade", text: {} },
      { name: "ExamScore", number: {} },
      { name: "IssuedDate", text: {} },
      { name: "IssuedBy", text: {} },
      { name: "IssuedByName", text: {} },
      { name: "VerificationCode", text: {} },
      { name: "VerificationUrl", text: {} },
      { name: "Status", choice: { choices: ["issued", "revoked", "expired"] } },
      { name: "RevokedAt", text: {} },
      { name: "RevocationReason", text: {} },
      { name: "RevokedBy", text: {} },
      { name: "FirestoreId", text: {} },
      { name: "CreatedAt", text: {} },
    ]);

    console.log("\n✅ SchoolCertificates SharePoint list is ready.");
  } catch (err) {
    console.error("Setup failed:", err);
    process.exit(1);
  }
}

run();
