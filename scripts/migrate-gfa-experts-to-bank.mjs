/**
 * migrate-gfa-experts-to-bank.mjs
 *
 * Maps the GFA / TVET4RE project's uploaded expert CVs (stored in the
 * ProjectStaffing list + ProjectPartner/{projectId}/CVs drive folder) into the
 * Master Expert Bank (ExpertBank + ExpertCvBank), and carries any existing
 * ProjectEvaluations into ExpertEvaluationBank.
 *
 * Idempotent: safe to re-run. Experts are deduped by NormalizedKey (email, else
 * lowercased name). CVs are deduped by DrivePath. Evaluations by ExpertId+Project.
 *
 * Usage:
 *   node scripts/migrate-gfa-experts-to-bank.mjs [PROJECT_CODE]
 *   (PROJECT_CODE defaults to "TVET4RE")
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

// ── env ──────────────────────────────────────────────────────────────────────
try {
  const envFile = readFileSync(".env.local", "utf-8");
  envFile.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1].trim()] = v;
    }
  });
} catch {}

const PROJECT_CODE = process.argv[2] || "TVET4RE";

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});
const token = async () => (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken;

async function graph(method, url, body) {
  const headers = { Authorization: `Bearer ${await token()}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { if (res.status === 404 && method === "GET") return null; throw new Error(`${method} ${url} → ${res.status}: ${await res.text()}`); }
  return res.status !== 204 ? res.json() : null;
}

async function siteId() {
  const u = new URL(process.env.SHAREPOINT_SITE_URL);
  let p = u.pathname.replace(/\/+$/, ""); if (!p.startsWith("/")) p = "/" + p;
  return (await graph("GET", `/sites/${u.hostname}:${p}`)).id;
}

const escape = (s) => String(s || "").replace(/'/g, "''");
const normalizeKey = (email, name) => {
  const e = (email || "").trim().toLowerCase();
  if (e && /\S+@\S+\.\S+/.test(e)) return e;
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
};

async function allItems(sid, list) {
  const out = [];
  let url = `/sites/${sid}/lists/${list}/items?$expand=fields&$top=500`;
  while (url) {
    const page = await graph("GET", url);
    if (!page) break;
    out.push(...(page.value || []));
    url = page["@odata.nextLink"] ? page["@odata.nextLink"].replace("https://graph.microsoft.com/v1.0", "") : null;
  }
  return out;
}

async function run() {
  const sid = await siteId();
  console.log(`Site: ${sid}`);

  // 1) Resolve project by code
  const projects = await allItems(sid, "Projects");
  const proj = projects.find((i) => i.fields?.Code === PROJECT_CODE);
  if (!proj) throw new Error(`Project with Code '${PROJECT_CODE}' not found`);
  const pid = proj.id;
  const pname = proj.fields?.Title || proj.fields?.Name || PROJECT_CODE;
  console.log(`Project: ${pname} (id=${pid})`);

  // 2) Read staffing rows for this project (the uploaded CVs live here)
  const staffing = (await allItems(sid, "ProjectStaffing")).filter((x) => x.fields?.ProjectId === pid);
  console.log(`Staffing rows for project: ${staffing.length}`);

  // Dedup by ExpertId (fallback to name)
  const byExpert = new Map();
  for (const it of staffing) {
    const f = it.fields;
    const dedupId = f.ExpertId || f.Title;
    if (!dedupId) continue;
    if (!byExpert.has(dedupId)) byExpert.set(dedupId, f);
  }
  console.log(`Unique experts: ${byExpert.size}`);

  // Preload existing bank data for idempotency
  const existingExperts = await allItems(sid, "ExpertBank");
  const expertByKey = new Map(existingExperts.map((e) => [e.fields?.NormalizedKey, e.id]));
  const existingCvs = await allItems(sid, "ExpertCvBank");
  const cvPaths = new Set(existingCvs.map((c) => c.fields?.DrivePath));

  // Existing project evaluations for this project
  const projEvals = (await allItems(sid, "ProjectEvaluations")).filter((x) => x.fields?.ProjectId === pid);
  const existingBankEvals = await allItems(sid, "ExpertEvaluationBank");
  const bankEvalKeys = new Set(existingBankEvals.map((e) => `${e.fields?.ExpertId}::${e.fields?.ProjectId}`));

  const now = new Date().toISOString();
  let createdExperts = 0, createdCvs = 0, createdEvals = 0;

  for (const [dedupId, f] of byExpert) {
    const name = f.Title || dedupId;
    const key = normalizeKey(f.Email, name);

    // 3) Upsert expert
    let bankExpertId = expertByKey.get(key);
    if (!bankExpertId) {
      const res = await graph("POST", `/sites/${sid}/lists/ExpertBank/items`, {
        fields: {
          Title: name.slice(0, 250), NormalizedKey: key, ExpertName: name,
          Email: f.Email || "", Position: f.Position || "", Nationality: "Bangladesh",
          Level: f.Position || "", Status: "available", BookingType: "",
          OfferedToJson: "[]", Tags: `${PROJECT_CODE}`, CreatedBy: "migration", CreatedAt: now,
        },
      });
      bankExpertId = res.id;
      expertByKey.set(key, bankExpertId);
      createdExperts++;
      console.log(`  + expert ${name}`);
    }

    // 4) CV bank row (drive path where the file already lives)
    const cvFile = f.CvFileName;
    if (cvFile) {
      const drivePath = `ProjectPartner/${pid}/CVs/${cvFile}`;
      if (!cvPaths.has(drivePath)) {
        await graph("POST", `/sites/${sid}/lists/ExpertCvBank/items`, {
          fields: {
            Title: cvFile.slice(0, 250), ExpertId: bankExpertId, FileName: cvFile,
            DrivePath: drivePath, Format: "original", Tailored: "false",
            TorExcerptId: "", ProjectId: pid, CreatedBy: "migration", CreatedAt: now,
          },
        });
        cvPaths.add(drivePath);
        createdCvs++;
        console.log(`    ↳ cv ${cvFile}`);
      }
    }

    // 5) Carry existing evaluation (if any) into the evaluation bank
    const evalRow = projEvals.find((e) => (e.fields?.ExpertId || e.fields?.Title) === dedupId);
    if (evalRow && !bankEvalKeys.has(`${bankExpertId}::${pid}`)) {
      const ef = evalRow.fields;
      await graph("POST", `/sites/${sid}/lists/ExpertEvaluationBank/items`, {
        fields: {
          Title: `${name} — ${pname}`.slice(0, 250), ExpertId: bankExpertId, ExpertName: name,
          ProjectId: pid, ProjectName: pname, MatrixId: ef.EvalType || "", TorExcerptId: "",
          ProposedPosition: ef.Position || f.Position || "", CvId: "", CvFileName: cvFile || "",
          Format: "original", ResultJson: ef.Scores || "{}",
          TorMatchPct: 0, TotalScore: Number(ef.TotalScore || 0), MaxScore: Number(ef.MaxScore || 0),
          Percentage: Number(ef.Percentage || 0), Strengths: "", Gaps: "",
          TorAnalysis: ef.Notes || "", Adjusted: "false", CreatedBy: "migration", CreatedAt: now,
        },
      });
      bankEvalKeys.add(`${bankExpertId}::${pid}`);
      createdEvals++;
      console.log(`    ↳ evaluation carried (${ef.Percentage || 0}%)`);
    }
  }

  console.log(`\n✅ Migration complete for ${PROJECT_CODE}:`);
  console.log(`   experts created: ${createdExperts}`);
  console.log(`   CVs linked:      ${createdCvs}`);
  console.log(`   evaluations:     ${createdEvals}`);
  console.log(`   (re-running is safe — existing records are skipped)`);
}

run().catch((err) => { console.error("Migration failed:", err); process.exit(1); });
