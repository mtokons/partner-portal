import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// Load variables from .env.local
try {
  const envFile = readFileSync(".env.local", "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
} catch (_) {}

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
  const existing = existingLists.value.find((l) => l.displayName === listName);
  if (existing) {
    console.log(`List '${listName}' already exists (${existing.id}). Skipping.`);
    return existing.id;
  }
  console.log(`Creating list '${listName}'...`);
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, {
    displayName: listName,
    columns,
    list: { template: "genericList" },
  });
  console.log(`✅ List '${listName}' created (${newList.id})`);
  return newList.id;
}

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  // ── Candidates ───────────────────────────────────────────────────────────────
  await createListIfNotExists(siteId, "Candidates", [
    { name: "Title", text: {} },           // FullName (mapped to Title)
    { name: "SccgId", text: {} },
    { name: "SubmissionId", text: {} },
    { name: "PartnerId", text: {} },
    { name: "PartnerName", text: {} },
    { name: "WorkflowCategory", choice: { choices: ["Training", "Ausbildung", "Student Visa", "Opportunity Card"] } },
    { name: "CurrentStatus", text: {} },
    { name: "DateOfBirth", dateTime: {} },
    { name: "Email", text: {} },
    { name: "Phone", text: {} },
    { name: "Address", text: { allowMultipleLines: true } },
    { name: "PassportNumber", text: {} },
    { name: "NationalId", text: {} },
    { name: "Nationality", text: {} },
    { name: "Country", text: {} },
    { name: "TotalServiceFee", number: {} },
    { name: "SccgShare", number: {} },
    { name: "PartnerShare", number: {} },
    { name: "DepositAmount", number: {} },
    { name: "MarginPercentage", number: {} },
    { name: "PaymentStatus", choice: { choices: ["pending", "deposit-paid", "fully-paid", "overdue"] } },
    { name: "PaymentMethod", text: {} },
    { name: "PaymentReference", text: {} },
    { name: "IsOnHold", boolean: {} },
    { name: "Notes", text: { allowMultipleLines: true } },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", dateTime: {} },
    { name: "UpdatedAt", dateTime: {} },
    { name: "SubmittedAt", dateTime: {} },
  ]);

  // ── CandidateServices ────────────────────────────────────────────────────────
  await createListIfNotExists(siteId, "CandidateServices", [
    { name: "Title", text: {} },           // ServiceName
    { name: "CandidateId", text: {} },
    { name: "ServicePricingId", text: {} },
    { name: "PackageType", choice: { choices: ["all-inclusive", "premium-bundle", "add-on"] } },
    { name: "BasePrice", number: {} },
    { name: "Quantity", number: {} },
    { name: "TotalPrice", number: {} },
    { name: "CreatedAt", dateTime: {} },
  ]);

  // ── CandidateTasks ───────────────────────────────────────────────────────────
  await createListIfNotExists(siteId, "CandidateTasks", [
    { name: "Title", text: {} },
    { name: "Description", text: { allowMultipleLines: true } },
    { name: "Status", choice: { choices: ["backlog", "todo", "in-progress", "review", "done"] } },
    { name: "Priority", choice: { choices: ["low", "medium", "high", "critical"] } },
    { name: "DueDate", dateTime: {} },
    { name: "AssignedTo", text: {} },
    { name: "CandidateId", text: {} },
    { name: "CandidateName", text: {} },
    { name: "TaskCategory", choice: { choices: ["Document Required", "Payment Due", "General Task"] } },
    { name: "WorkflowCategory", choice: { choices: ["Training", "Ausbildung", "Student Visa", "Opportunity Card"] } },
    { name: "PartnerId", text: {} },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", dateTime: {} },
    { name: "UpdatedAt", dateTime: {} },
  ]);

  // ── HelpdeskTickets ──────────────────────────────────────────────────────────
  await createListIfNotExists(siteId, "HelpdeskTickets", [
    { name: "Title", text: {} },           // Subject
    { name: "SccgId", text: {} },
    { name: "SubmittedByUserId", text: {} },
    { name: "SubmittedByName", text: {} },
    { name: "SubmittedByEmail", text: {} },
    { name: "PartnerId", text: {} },
    { name: "Category", choice: { choices: ["billing", "technical", "candidate", "workflow", "general"] } },
    { name: "Priority", choice: { choices: ["low", "medium", "high", "urgent"] } },
    { name: "Status", choice: { choices: ["open", "in-progress", "resolved", "closed"] } },
    { name: "Description", text: { allowMultipleLines: true } },
    { name: "AssignedTo", text: {} },
    { name: "RelatedCandidateId", text: {} },
    { name: "CreatedAt", dateTime: {} },
    { name: "UpdatedAt", dateTime: {} },
    { name: "ResolvedAt", dateTime: {} },
  ]);

  // ── HelpdeskMessages ─────────────────────────────────────────────────────────
  await createListIfNotExists(siteId, "HelpdeskMessages", [
    { name: "TicketId", text: {} },
    { name: "SenderUserId", text: {} },
    { name: "SenderName", text: {} },
    { name: "IsStaff", boolean: {} },
    { name: "Message", text: { allowMultipleLines: true } },
    { name: "AttachmentUrl", text: {} },
    { name: "CreatedAt", dateTime: {} },
  ]);

  console.log("\n✅ All candidate portal lists provisioned successfully!");
}

run().catch((err) => {
  console.error("❌ Provisioning failed:", err.message);
  process.exit(1);
});
