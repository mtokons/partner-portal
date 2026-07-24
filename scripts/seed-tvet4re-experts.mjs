/**
 * seed-tvet4re-experts.mjs — official-format staffing matrix + CV upload for TVET4RE.
 * Privacy: NO email/phone. Default contact admin@mysccg.de. CVs renamed "<ExpertId> - <Name>.docx".
 * Run: node scripts/seed-tvet4re-experts.mjs
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config({ path: ".env.local" });
if (!process.env.AZURE_AD_CLIENT_ID) dotenv.config({ path: ".env.production" });

const CV_DIR = resolve("ProjectPartner/CVs");
const cca = new ConfidentialClientApplication({ auth: { clientId: process.env.AZURE_AD_CLIENT_ID, authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`, clientSecret: process.env.AZURE_AD_CLIENT_SECRET } });
async function token() { return (await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] })).accessToken; }
async function graph(m, u, b) { const h = { Authorization: `Bearer ${await token()}` }; if (b) h["Content-Type"] = "application/json"; const r = await fetch(`https://graph.microsoft.com/v1.0${u}`, { method: m, headers: h, body: b ? JSON.stringify(b) : undefined }); if (!r.ok) { if (r.status === 404 && m === "GET") return null; throw new Error(`${m} ${r.status}: ${await r.text()}`); } return r.status !== 204 ? r.json() : null; }
async function siteId() { const u = new URL(process.env.SHAREPOINT_SITE_URL); let p = u.pathname.replace(/\/+$/, ""); if (!p.startsWith("/")) p = "/" + p; return (await graph("GET", `/sites/${u.hostname}:${p}`)).id; }
async function upload(sid, path, buf) { const h = { Authorization: `Bearer ${await token()}`, "Content-Type": "application/octet-stream" }; const r = await fetch(`https://graph.microsoft.com/v1.0/sites/${sid}/drive/root:/${path.split("/").map(encodeURIComponent).join("/")}:/content`, { method: "PUT", headers: h, body: buf }); if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`); return r.json(); }

const WP1 = "Revision and development of occupational/competency standards and curricula in industrial/environmental safety and sustainable energy";
const WP2 = "Strengthening trainer capacity and piloting curricula implementation";
const WP3 = "Strengthening industry engagement and workplace-based learning systems";

// id, wp, focus, position, name, edu, profExp, specificExp, devCoop, cv, status
const EXPERTS = [
  ["EXP-001", "WP 1: Curricula Development", WP1, "Expert 2: Deputy Team Leader", "Mohammed Shamsul Arifin", "MSc in Vocational Education, TU Dresden", "11+ yrs sustainable energy engineering (Off-Grid PV, E-Mobility, energy efficiency) across Germany, Bangladesh, Sudan, Zambia; technical advisor & research fellow for GIZ/KfW/EU, Univ. Flensburg.", "20+ yrs intl TVET; 10+ yrs (2011–2026) creating CBT curricula, occupational standards & RPL frameworks with private sector/trade union engagement; 15+ yrs national ToT frameworks & TLM for GIZ/IsDB.", "18+ yrs managing intl development projects (GIZ/BMZ, KfW, EU, OXFAM, IsDB); roles: Component Leader (GIZ Afghanistan), Tech Advisor (GIZ Sudan), Lead Author BD National TVET Master Plan.", "CV_Arifin.docx", "active"],
  ["EXP-002", "WP 1: Curricula Development", WP1, "Expert Pool 2: Senior TVET Curriculum & CBT Expert", "Dr. Md. Shah Alam Majumder", "Doctorate, MSc", "35+ yrs Bangladesh TVET; ex-Polytechnic Vice Principal (250+ staff); BTEB Course Accreditation Specialist.", "10+ yrs developing 450+ national competency standards & CBT curricula with ISCs; 5+ yrs reforming ToT & authoring CBT&A Master Trainer (L6) standards.", "10+ yrs donor projects; IsDB Co-Team Leader DTTTI; EU RBM working group.", "CV Md. Shah Alam.docx", "active"],
  ["EXP-003", "WP 1: Curricula Development", WP1, "Expert Pool 2: Teaching Learning Materials & Assessment Expert", "S.M Shahjahan", "MSc, MSc", "28 yrs TVET; BTEB Deputy Director Course Accreditation; rollout 546 competency standards / 268 occupations.", "15+ yrs occupational standards & competency curricula; 655 CBLMs; 12+ yrs ToT — trained 80 master trainers, 200 trainers, 500 assessors.", "14+ yrs donor execution; focal person for ILO (Skills21, ProGRESS, B-SEP), GIZ (HELD), KOICA, WB, ADB.", "CV S.M Shahjahan.docx", "active"],
  ["EXP-004", "WP 1: Curricula Development", WP1, "Expert Pool 2: Renewable Energy / Solar PV Expert", "Engr. Md. Liaquat Ali", "Doctorate, MSc", "25+ yrs engineering in industrial/environmental safety, OHS & energy infrastructure; MD of SESL; executive roles in energy corporations.", "10+ yrs TVET standards/curricula; revised 15+ national safety codes & BDS ISO frameworks; 10+ yrs advanced ToT safety frameworks.", "5 yrs supporting intl development cooperation & PPPs on regulatory alignment, industrial safety & skills frameworks.", "CV Liaquat Ali.docx", "active"],
  ["EXP-005", "WP 1: Curricula Development", WP1, "Expert Pool 2: Energy Efficiency & Energy Management Expert (Pool 1, Nat/Intl)", "Dr. Md. Aktaruzzaman", "Doctorate, MSc", "18+ yrs global engineering in sustainable energy (BESS, grid integration, wind/solar hybrids); GM Power Systems, Akaysha Energy AU.", "15 yrs leading technical groups on competency standards & curricula; 10+ yrs ToT & technical manuals.", "10+ yrs grid modernization, coordinating IEEE, market operators, developers & regulators.", "CV Aktarujjaman.docx", "active"],
  ["EXP-006", "WP 1: Curricula Development", WP1, "Expert Pool 2: Electrical & Power Systems TVET Expert", "Khan Md. Foysol", "MSc in Technical Education", "20+ yrs TVET; Assistant Professor (Electrical) BUTEX; tenure across public polytechnics.", "12 yrs national competency standards & engineering curricula (energy/safety); 15+ yrs ToT & instructional materials.", "12+ yrs intl development; PhD Research Associate IsDB — formulated DTTTI teacher training curriculum.", "CV_Khan Foysol.docx", "active"],
  ["EXP-007", "WP 1: Curricula Development", WP1, "Expert Pool 2: Occupational Health & Safety (OHS) Expert", "Shah Md Nurul Islam", "MSc in Technical Education", "22+ yrs global HSE across Singapore, Malaysia, Bangladesh; Senior HSE Consultant; ex-WSH Officer & corporate trainer.", "10+ yrs TVET curricula & competency standards; 10+ yrs ToT & pedagogical safety handbooks.", "10+ yrs directing education/vocational/industrial safety programs under major global donors.", "CV_Shah MD Nurul Islam_PRECISE - TVET4RE Compliant.docx", "active"],
  ["EXP-008", "WP 1: Curricula Development", WP1, "Expert Pool 2: Environmental / ESG / Chemical Safety Expert", "Dr. A. M. Zahirul Islam", "Doctorate, MSc", "35+ yrs plant ops & public TVET; 11 yrs Chief Instructor/HoD Dhaka Polytechnic; Process Expert Consultant MoF (SICIP).", "15+ yrs occupational/competency standards, CBC & CAD; L5 CBT&A Master Trainer; 30+ CBLMs; 13+ ToT cycles.", "10+ yrs donor projects; UNICEF, ILO, KOICA, USAID, HELVETAS consultant.", "CV_Zahirul Islam_PRECISE - TVET4RE Compliant.docx", "active"],
  ["EXP-007", "WP 1: Curricula Development", WP1, "Expert Pool 2: Industrial Safety / Fire & Factory Compliance Expert", "Shah Md Nurul Islam", "MSc in Technical Education", "22+ yrs HSE; industrial safety, environmental & occupational health systems.", "10+ yrs TVET curricula & ToT; pedagogical safety handbooks.", "300+ industrial/RMG sites under ACCORD/ALLIANCE/FBCCI compliance frameworks.", "CV_Shah MD Nurul Islam_PRECISE - TVET4RE Compliant.docx", "active"],
  ["EXP-009", "WP 1: Curricula Development", WP1, "Expert Pool 2: Mechanical / HVAC / RAC Expert", "Dr. A T M Habibullah", "Doctorate, MSc", "40+ yrs TVET leadership; 15 yrs Asst Prof & Head Mechanical Eng TTTC Dhaka.", "20+ yrs TVET teacher education & instructional design; TESDA CBT Master Trainer; TNA & BNQF/NTVQF mapping.", "Components & compliance for GIZ, EU, JICA (cluster leader HR needs), IsDB.", "CV Habibullah Khan.docx", "active"],
  ["EXP-010", "WP 1: Curricula Development", WP1, "Expert Pool 2: Automotive / EV / Mechatronics Expert", "Salim Mirdha", "PGDTE", "37+ yrs technical education; 17+ yrs Principal Govt Technical Schools; Principal DCPI.", "10+ yrs competency standards & curricula with private sector; BTEB Curriculum Specialist; 10+ yrs ToT.", "10+ yrs WB, ADB, ILO project implementation.", "CV_Selim Mridha.docx", "active"],
  ["EXP-011", "WP 2: Teacher Training & Piloting", WP2, "Expert Pool 2: TVET Pedagogy & ToT Expert (Pool 1)", "Md. Nahiduzzaman", "MSc", "TVET pedagogy & training-of-trainers specialist.", "Instructional design, capacity building & ToT delivery.", "Donor-aligned teacher training initiatives.", "CV_Md. Nahiduzzaman.docx", "standby"],
  ["EXP-012", "WP 2: Teacher Training & Piloting", WP2, "Expert Pool 2: Institutional Capacity Development Expert", "Prof. Dr. Syed Abdul Aziz", "Doctorate, MSc", "37+ yrs TVET leadership; 17 yrs Principal under DTE; University Professor & ED of IETI.", "15+ yrs occupational standards; 68 TVET teacher curricula; 12+ yrs national ToT frameworks.", "20+ yrs ILO, IsDB, OXFAM frameworks.", "CV_Syed Abdul Aziz.docx", "active"],
  ["EXP-013", "WP 2: Teacher Training & Piloting", WP2, "Expert Pool 2: Teaching Learning Materials & Assessment Expert", "Dr. Md. Quamruzzaman", "Doctorate in TVET, MBA", "35+ yrs TVET; Director BTEB & NSDA; Principal multiple colleges.", "10+ yrs competency standards, BNQF & curricula; 10+ yrs ToT & CBLM.", "10+ yrs WB, ADB, ILO, UNDP, GIZ (PRECISE & TVET4RE senior resource).", "CV_Quamruzzaman.docx", "active"],
  ["EXP-014", "WP 2: Teacher Training & Piloting", WP2, "Expert Pool 2: Sectoral Technical Experts (RE/OHS/HVAC/EV)", "Eng. B.M Mafizur Rahman", "MSc, MBA", "15+ yrs TVET; Senior Specialist UCEP Bangladesh; chief coordinator SAIC.", "15 yrs competency standards & assessment with ISCs; 8+ yrs ToT; L5 CBT&A Master Trainer.", "12+ yrs intl projects; occupational mapping with ADB & development partners.", "CV_ Mofizur.docx", "active"],
  ["EXP-015", "WP 3: Private Sector Cooperation", WP3, "Expert Pool 2: Industry Linkage & Cooperative Training Expert", "Firoj Alam Molla", "MSc", "23+ yrs TVET; National Consultant; roles at PMO (a2i), BTEB, BMET.", "15+ yrs NTVQF/BNQF, competency standards & CBLM; 5+ yrs ToT with BGMEA/CEBAI/ISCs.", "10+ yrs ILO, UNICEF, UNDP, JICA, ADB skills & apprenticeship initiatives.", "CV_Feroj Molla.docx", "active"],
  ["EXP-016", "WP 3: Private Sector Cooperation", WP3, "Expert Pool 2: Occupational Health & Safety (OHS) Expert", "Al-Emran", "MSc", "20+ yrs engineering/HVAC/industrial safety; VC OSBB; President & CEO BGBA.", "10+ yrs ToT; occupational standards & safety teaching materials.", "10+ yrs ACCORD/ALLIANCE/FBCCI compliance across 300+ sites.", "CV_ Al Emran.docx", "active"],
  ["EXP-017", "WP 3: Private Sector Cooperation", WP3, "Expert Pool 2: Environmental / ESG Expert", "Dr. Md. Shajahan", "Doctorate, MSc", "40+ yrs engineering education & policy; Principal Dhaka & Khulna Polytechnic; BTEB Director/Secretary.", "15+ yrs CBET curricula; 10+ yrs ToT & instructional materials.", "12+ yrs intl projects; QA, compliance & project management.", "CV_ Md Shah jahan.docx", "active"],
  ["EXP-005", "WP 3: Private Sector Cooperation", WP3, "Expert Pool 2: Renewable Energy / Energy Efficiency Expert (Pool 1, Nat/Intl)", "Dr. Md. Aktaruzzaman", "Doctorate, MSc", "18+ yrs sustainable energy (BESS, grid integration, hybrids); GM Akaysha Energy AU.", "15 yrs competency standards & curricula; 10+ yrs ToT & manuals.", "10+ yrs grid modernization with IEEE, operators & regulators.", "CV Aktarujjaman.docx", "active"],
];

async function run() {
  const sid = await siteId();
  const list = await graph("GET", `/sites/${sid}/lists/Projects/items?$expand=fields&$top=200`);
  const proj = (list?.value || []).find((i) => i.fields?.Code === "TVET4RE");
  if (!proj) throw new Error("TVET4RE project not found");
  const pid = proj.id;
  const old = await graph("GET", `/sites/${sid}/lists/ProjectStaffing/items?$expand=fields&$top=500`);
  for (const it of (old?.value || []).filter((x) => x.fields?.ProjectId === pid)) await graph("DELETE", `/sites/${sid}/lists/ProjectStaffing/items/${it.id}`);

  const uploaded = new Set();
  let order = 0;
  for (const [eid, wp, focus, position, name, edu, profExp, specExp, devCoop, cv, status] of EXPERTS) {
    const newName = `${eid} - ${name}.docx`;
    if (!uploaded.has(newName)) { await upload(sid, `ProjectPartner/${pid}/CVs/${newName}`, readFileSync(resolve(CV_DIR, cv))); uploaded.add(newName); console.log(`  ↑ ${newName}`); }
    await graph("POST", `/sites/${sid}/lists/ProjectStaffing/items`, { fields: {
      Title: name, ProjectId: pid, WorkPackage: wp, FocusObjective: focus, Position: position, ExpertId: eid,
      Education: edu, ProfExperience: profExp, SpecificExperience: specExp, DevCooperation: devCoop,
      Expertise: `${edu}. ${profExp}`, CvFileName: newName, ActiveStatus: status,
      Notes: `${wp.split(":")[0]} · Contact: admin@mysccg.de`, SortOrder: String(++order), CreatedAt: new Date().toISOString(),
    }});
    console.log(`  + #${order} ${eid} ${name}`);
  }
  console.log(`\n✅ ${order} entries, ${uploaded.size} CVs (official format, no PII).`);
}
run().catch((e) => { console.error(e); process.exit(1); });
