import { ConfidentialClientApplication } from "@azure/msal-node";
import { readFileSync } from "fs";

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

const emailToFind = "mhasnainn@gmail.com";

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

const t = await cca.acquireTokenByClientCredential({ scopes: ["https://graph.microsoft.com/.default"] });
const auth = { Authorization: `Bearer ${t.accessToken}` };
const u = new URL(process.env.SHAREPOINT_SITE_URL);
const sitePath = u.pathname.replace(/\/+$/, "") || "/";
const site = await fetch(`https://graph.microsoft.com/v1.0/sites/${u.hostname}:${sitePath}`, { headers: auth }).then(r => r.json());
console.log("Site ID:", site.id);

async function inspectList(listName) {
  console.log(`\n--- Inspecting List: ${listName} ---`);
  const lists = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists?$filter=displayName eq '${listName}'`, { headers: auth }).then(r => r.json());
  const list = lists.value?.[0];
  if (!list) {
    console.log(`List '${listName}' not found`);
    return;
  }
  
  const items = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items?$expand=fields&$top=1000`, { headers: auth }).then(r => r.json());
  console.log(`Total items retrieved from ${listName}:`, items.value?.length || 0);

  const matchingItems = items.value?.filter(item => {
    return Object.values(item.fields || {}).some(v => 
      typeof v === "string" && v.toLowerCase() === emailToFind.toLowerCase()
    );
  });

  if (matchingItems && matchingItems.length > 0) {
    console.log(`Found matching items in ${listName}:`, JSON.stringify(matchingItems.map(i => i.fields), null, 2));
  } else {
    console.log(`No match for ${emailToFind} in ${listName}`);
    if (items.value?.length > 0) {
      console.log("Sample of first 3 items:");
      console.log(JSON.stringify(items.value.slice(0, 3).map(i => i.fields), null, 2));
    }
  }
}

await inspectList("Partners");
await inspectList("UserProfiles");
await inspectList("UserRoles");
