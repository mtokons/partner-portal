import { readFileSync } from "fs";

try {
  const env = readFileSync(".env.production", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

import { getGraphClient } from "../src/lib/graph";

async function testOtherSites() {
  const client = await getGraphClient();
  const searchRes = await client.api("/sites?search=*").get();

  for (const s of searchRes.value || []) {
    try {
      const res = await client.api(`/sites/${s.id}`).get();
      console.log(`[ALLOWED] ${s.name} (${s.id})`);
    } catch (err: any) {
      console.log(`[DENIED 403] ${s.name} (${s.id})`);
    }
  }
}

testOtherSites();
