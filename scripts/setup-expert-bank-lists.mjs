import { ConfidentialClientApplication } from "@azure/msal-node";
import 'dotenv/config';
import { readFileSync } from 'fs';

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
} catch {}

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});
const getToken = async () => (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken;

async function graphRequest(method, url, body) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { if (res.status === 404 && method === "GET") return null; throw new Error(`Graph API error: ${res.status} ${await res.text()}`); }
  return res.status !== 204 ? res.json() : null;
}

async function resolveSiteId() {
  const { hostname, pathname } = new URL(process.env.SHAREPOINT_SITE_URL);
  let sitePath = pathname.replace(/\/+$/, ""); if (!sitePath.startsWith("/")) sitePath = "/" + sitePath;
  return (await graphRequest("GET", `/sites/${hostname}:${sitePath}`)).id;
}

async function ensureColumns(siteId, listId, columns) {
  const existing = await graphRequest("GET", `/sites/${siteId}/lists/${listId}/columns`);
  const have = new Set(existing.value.map(c => c.name));
  for (const col of columns) {
    if (have.has(col.name)) continue;
    console.log(`  + adding column ${col.name}`);
    await graphRequest("POST", `/sites/${siteId}/lists/${listId}/columns`, col);
  }
}

async function createListIfNotExists(siteId, listName, columns) {
  const lists = await graphRequest("GET", `/sites/${siteId}/lists`);
  const existing = lists.value.find(l => l.displayName === listName);
  if (existing) { console.log(`List '${listName}' exists. Ensuring columns…`); await ensureColumns(siteId, existing.id, columns); return existing.id; }
  console.log(`Creating list '${listName}'…`);
  const newList = await graphRequest("POST", `/sites/${siteId}/lists`, { displayName: listName, columns, list: { template: "genericList" } });
  console.log(`List '${listName}' created (ID: ${newList.id}).`);
  return newList.id;
}

const multiline = { allowMultipleLines: true, appendChangesToExistingText: false, linesForEditing: 6, textType: "plain" };

async function run() {
  const siteId = await resolveSiteId();
  console.log(`Site ID: ${siteId}\n`);

  // Master expert registry — one row per unique expert (deduped by NormalizedKey)
  await createListIfNotExists(siteId, "ExpertBank", [
    { name: "NormalizedKey", text: {} },      // email lowercased, else normalized name
    { name: "ExpertName", text: {} },
    { name: "Email", text: {} },
    { name: "Position", text: {} },
    { name: "Nationality", text: {} },
    { name: "CurrentLocation", text: {} },
    { name: "Level", text: {} },              // seniority/role level (e.g. Team Leader, Key Expert 1)
    { name: "Status", text: {} },             // available | offered | booked | locked
    { name: "BookingType", text: {} },         // "" | soft | hard
    { name: "LockedByPartnerId", text: {} },
    { name: "LockedByPartnerName", text: {} },
    { name: "AssignedProjectId", text: {} },
    { name: "AssignedProjectName", text: {} },
    { name: "OfferedToJson", text: multiline },// partner ids this expert is offered to
    { name: "Tags", text: {} },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  // Multiple CVs per expert (each tagged with its output format + tailored flag)
  await createListIfNotExists(siteId, "ExpertCvBank", [
    { name: "ExpertId", text: {} },
    { name: "FileName", text: {} },
    { name: "DrivePath", text: multiline },
    { name: "Format", text: {} },             // giz | eu | ucep | custom1 | original
    { name: "Tailored", text: {} },           // "true" | "false"
    { name: "TorExcerptId", text: {} },
    { name: "ProjectId", text: {} },
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", text: {} },
  ]);

  // Multiple evaluation reports per expert (linked to project/matrix/tor/cv)
  await createListIfNotExists(siteId, "ExpertEvaluationBank", [
    { name: "ExpertId", text: {} },
    { name: "ExpertName", text: {} },
    { name: "ProjectId", text: {} },
    { name: "ProjectName", text: {} },
    { name: "MatrixId", text: {} },
    { name: "TorExcerptId", text: {} },
    { name: "ProposedPosition", text: {} },
    { name: "CvId", text: {} },
    { name: "CvFileName", text: {} },
    { name: "Format", text: {} },
    { name: "ResultJson", text: multiline },  // full TailorResult JSON
    { name: "TorMatchPct", number: {} },
    { name: "TotalScore", number: {} },
    { name: "MaxScore", number: {} },
    { name: "Percentage", number: {} },
    { name: "Strengths", text: multiline },
    { name: "Gaps", text: multiline },
    { name: "TorAnalysis", text: multiline }, // short TOR rating analysis
    { name: "Adjusted", text: {} },           // "true" once a human edits it
    { name: "CreatedBy", text: {} },
    { name: "CreatedAt", text: {} },
    { name: "UpdatedAt", text: {} },
  ]);

  console.log("\n✅ Master Expert Bank SharePoint lists are ready.");
}

run().catch((err) => { console.error("Setup failed:", err); process.exit(1); });
