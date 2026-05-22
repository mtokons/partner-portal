import { readFileSync } from "fs";

// Load local env
try {
  const env = readFileSync(".env.local", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

const email = "mhasnainn@gmail.com";

// Simulate buildRolesForEmail logic from src/auth.ts
import { Repository } from "../src/lib/repository/index.js";

async function testBuild() {
  const roles = [];
  let partnerId = "";
  let company = "";
  let customerId;
  let expertId;
  let partnerType;
  let coinBalance;
  let primaryRole = "partner";
  let name = "";

  console.log("Checking SharePoint Partners...");
  const partner = await Repository.partners.getByEmail(email);
  console.log("SharePoint Partners Result:", partner);
  
  if (partner && partner.status !== "suspended") {
    primaryRole = partner.role;
    roles.push(primaryRole === "admin" ? "admin" : "partner");
    if (primaryRole === "partner") {
      const pType = (partner.partnerType || "individual").toLowerCase();
      roles.push(`partner-${pType}`);
    }
    if (partner.onboardingStatus?.toLowerCase() === "approved") {
      partnerId = partner.id;
    }
    company = partner.company || "";
    if (!name) name = partner.name;
    partnerType = (partner.partnerType || "individual").toLowerCase();

    try {
      const { getCoinWallet } = await import("../src/lib/sharepoint.js");
      const wallet = await getCoinWallet(partner.id);
      if (wallet) coinBalance = wallet.balance;
    } catch (e) {
      console.log("Failed to load coin balance:", e.message);
    }
  }

  console.log("Check SharePoint Customers...");
  const customer = await Repository.customers.getByEmail(email);
  console.log("SharePoint Customers Result:", customer);

  console.log("Check SharePoint Experts...");
  const expert = await Repository.experts.getByEmail(email);
  console.log("SharePoint Experts Result:", expert);

  if (!roles.includes(primaryRole)) roles.push(primaryRole);

  const res = { roles, partnerId, company, customerId, expertId, partnerType, coinBalance, primaryRole, name };
  console.log("\n--- Build Roles Result ---");
  console.log(JSON.stringify(res, null, 2));
}

testBuild().catch(console.error);
