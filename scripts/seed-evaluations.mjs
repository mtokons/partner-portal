/**
 * seed-evaluations.mjs — provisions the ProjectEvaluations list and scores every
 * expert's CV against the official PRECISE – TVET4RE evaluation matrix.
 * Scoring is derived deterministically from each expert's staffing-matrix profile
 * (education + professional experience), mirroring the GIZ Evaluation Matrix workbook.
 * Run: node scripts/seed-evaluations.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (!process.env.AZURE_AD_CLIENT_ID) dotenv.config({ path: ".env.production" });

const cca = new ConfidentialClientApplication({ auth: { clientId: process.env.AZURE_AD_CLIENT_ID, authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`, clientSecret: process.env.AZURE_AD_CLIENT_SECRET } });
async function token() { return (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken; }
async function graph(m, u, b) { const h = { Authorization: `Bearer ${await token()}` }; if (b) h["Content-Type"] = "application/json"; const r = await fetch(`https://graph.microsoft.com/v1.0${u}`, { method: m, headers: h, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) { if (r.status === 404 && m === "GET") return null; throw new Error(`${m} ${r.status}: ${await r.text()}`); } return r.status !== 204 ? r.json() : null; }
async function siteId() { const u = new URL(process.env.SHAREPOINT_SITE_URL); let p = u.pathname.replace(/\/+$/, ""); if (!p.startsWith("/")) p = "/" + p; return (await graph("GET", `/sites/${u.hostname}:${p}`)).id; }

// Templates (must mirror src/lib/evaluation.ts)
const TPL = {
  "expert-2": { min: 85, c: [["education","Education/Training",1],["lang_en","Language",0.5],["lang_bn","Language",0.5],["gen_exp","General Prof. Experience",4],["spec_exp","Specific Prof. Experience",4],["leadership","Leadership/Management",2],["country_exp","Country Experience",1],["dev_coop","Dev. Cooperation",2],["other","Other",2]] },
  "pool-1": { min: 85, c: [["education","Education/Training",1],["lang_en","Language",1],["gen_exp","General Prof. Experience",3],["spec_exp","Specific Prof. Experience",4],["intl_exp","International Experience",1],["country_exp","Region Experience",1],["dev_coop","Dev. Cooperation",1],["other","Other",1]] },
  "pool-2": { min: 85, c: [["education","Education/Training",1],["lang_en","Language",0.5],["lang_bn","Language",0.5],["gen_exp","General Prof. Experience",3],["spec_exp","Specific Prof. Experience",4],["country_exp","Country Experience",1],["dev_coop","Dev. Cooperation",2],["other","Other",1]] },
};

const has = (t, kws) => kws.some((k) => t.includes(k));
function fraction(key, t) {
  switch (key) {
    case "education": return 1;
    case "lang_en": return 1;
    case "lang_bn": return 1;
    case "gen_exp": return has(t, ["engineer", "energy", "safety", "hse", "industrial", "power", "mechanical", "electrical"]) ? 1 : 0.8;
    case "spec_exp": return has(t, ["tvet", "competency", "curricul", "cbt", "standard", "cblm", "bteb", "nsda"]) ? 1 : 0.75;
    case "leadership": return has(t, ["principal", "director", "head", "lead", "manag", "coordinat", "vice", "professor", "general manager"]) ? 1 : 0.7;
    case "country_exp": return has(t, ["bangladesh", "bteb", "polytechnic", "dhaka", "national", "khulna"]) ? 1 : 0.6;
    case "intl_exp": return has(t, ["australia", "singapore", "malaysia", "germany", "global", "international", "sudan", "zambia"]) ? 1 : 0.6;
    case "dev_coop": return has(t, ["giz", "ilo", "adb", "world bank", "unicef", "isdb", "donor", "development cooperation", "jica", "koica", "undp", "kfw", "oxfam", "eu", "bmz"]) ? 1 : 0.7;
    case "other": return has(t, ["tot", "training of trainers", "cblm", "teaching", "master trainer", "tlm", "gender", "inclusi"]) ? 1 : 0.7;
    default: return 0.8;
  }
}
const round25 = (n) => Math.round(n * 4) / 4;

// expertId -> evaluation template
function evalTypeFor(eid) {
  if (eid === "EXP-001") return "expert-2";
  if (eid === "EXP-005") return "pool-1";
  return "pool-2";
}

async function run() {
  const sid = await siteId();

  // 1. ensure list
  const lists = await graph("GET", `/sites/${sid}/lists`);
  if (!lists.value.find((l) => l.displayName === "ProjectEvaluations")) {
    await graph("POST", `/sites/${sid}/lists`, { displayName: "ProjectEvaluations", list: { template: "genericList" }, columns: [
      { name: "ProjectId", text: {} }, { name: "ExpertId", text: {} }, { name: "Position", text: {} },
      { name: "EvalType", text: {} }, { name: "Scores", text: { allowMultipleLines: true } },
      { name: "TotalScore", number: {} }, { name: "MaxScore", number: {} }, { name: "Percentage", number: {} },
      { name: "Passed", text: {} }, { name: "MinPercent", number: {} }, { name: "CvFileName", text: {} },
      { name: "Notes", text: { allowMultipleLines: true } }, { name: "CreatedAt", text: {} }, { name: "UpdatedAt", text: {} },
    ]});
    console.log("+ ProjectEvaluations list created");
  } else console.log("✓ ProjectEvaluations exists");

  // 2. project + staffing
  const pl = await graph("GET", `/sites/${sid}/lists/Projects/items?$expand=fields&$top=200`);
  const proj = (pl?.value || []).find((i) => i.fields?.Code === "TVET4RE");
  if (!proj) throw new Error("TVET4RE project not found");
  const pid = proj.id;
  const sl = await graph("GET", `/sites/${sid}/lists/ProjectStaffing/items?$expand=fields&$top=500`);
  const staffing = (sl?.value || []).filter((x) => x.fields?.ProjectId === pid).map((x) => x.fields);

  // dedupe by ExpertId (first occurrence keeps its position)
  const byExpert = new Map();
  for (const f of staffing) { if (!byExpert.has(f.ExpertId)) byExpert.set(f.ExpertId, f); }

  // clear old evaluations for this project
  const old = await graph("GET", `/sites/${sid}/lists/ProjectEvaluations/items?$expand=fields&$top=500`);
  for (const it of (old?.value || []).filter((x) => x.fields?.ProjectId === pid)) await graph("DELETE", `/sites/${sid}/lists/ProjectEvaluations/items/${it.id}`);

  let n = 0;
  for (const f of byExpert.values()) {
    const type = evalTypeFor(f.ExpertId);
    const tpl = TPL[type];
    const text = `${f.Education || ""} ${f.ProfExperience || ""} ${f.SpecificExperience || ""} ${f.DevCooperation || ""} ${f.Position || ""}`.toLowerCase();
    const scores = tpl.c.map(([key, , max]) => ({ key, score: round25(max * fraction(key, text)) }));
    const totalScore = Math.round(scores.reduce((s, x) => s + x.score, 0) * 100) / 100;
    const maxScore = tpl.c.reduce((s, [, , m]) => s + m, 0);
    const percentage = Math.round((totalScore / maxScore) * 1000) / 10;
    const passed = percentage >= tpl.min;
    await graph("POST", `/sites/${sid}/lists/ProjectEvaluations/items`, { fields: {
      Title: f.Title, ProjectId: pid, ExpertId: f.ExpertId, Position: f.Position, EvalType: type,
      Scores: JSON.stringify(scores), TotalScore: totalScore, MaxScore: maxScore, Percentage: percentage,
      Passed: String(passed), MinPercent: tpl.min, CvFileName: f.CvFileName || "", CreatedAt: new Date().toISOString(),
    }});
    n++;
    console.log(`  + ${f.ExpertId} ${f.Title} [${type}] ${totalScore}/${maxScore} = ${percentage}% ${passed ? "✓" : "✗"}`);
  }
  console.log(`\n✅ ${n} expert evaluations scored.`);
}
run().catch((e) => { console.error(e); process.exit(1); });
