import { readFileSync } from "fs";
import * as admin from "firebase-admin";
import { ConfidentialClientApplication } from "@azure/msal-node";

// Load local environment
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

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, "\n"),
};

if (!admin.default.apps.length) {
  admin.default.initializeApp({
    credential: admin.default.credential.cert(serviceAccount),
  });
}

const db = admin.default.firestore();

// Initialize MSAL Client for Graph API
const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
});

async function run() {
  try {
    console.log("Acquiring Microsoft Graph API access token...");
    const tokenResult = await cca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    const authHeader = { Authorization: `Bearer ${tokenResult.accessToken}` };

    // Resolve site ID
    const u = new URL(process.env.SHAREPOINT_SITE_URL);
    const sitePath = u.pathname.replace(/\/+$/, "") || "/";
    const site = await fetch(`https://graph.microsoft.com/v1.0/sites/${u.hostname}:${sitePath}`, { headers: authHeader }).then(r => r.json());
    console.log("Site Resolved:", site.displayName, site.id);

    // Get Partners list ID
    const lists = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists?$filter=displayName eq 'Partners'`, { headers: authHeader }).then(r => r.json());
    const list = lists.value?.[0];
    if (!list) {
      console.error("Partners list not found in SharePoint.");
      process.exit(1);
    }
    console.log("Partners List ID:", list.id);

    // Fetch active partners from Firestore
    console.log("Querying active partners from Firestore...");
    const snap = await db.collection("users")
      .where("role", "==", "partner")
      .where("status", "==", "active")
      .get();

    console.log(`Found ${snap.size} active partners in Firestore.`);

    for (const doc of snap.docs) {
      const userData = doc.data();
      const email = userData.email;
      console.log(`\nReconciling partner: ${email} (${userData.displayName})`);

      // Query SharePoint Partners list for this email
      // We'll fetch all items first and filter in JavaScript to be 100% safe about casing and filters
      const itemsRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items?$expand=fields&$top=1000`, { headers: authHeader }).then(r => r.json());
      const spPartner = itemsRes.value?.find(item => {
        const itemEmail = item.fields?.Email || "";
        return itemEmail.toLowerCase() === email.toLowerCase();
      });

      if (!spPartner) {
        console.log(`Partner ${email} not found in SharePoint Partners list. Creating it...`);
        const body = {
          fields: {
            Title: userData.displayName || "Partner",
            Email: email,
            PasswordHash: "",
            Role: "partner",
            Status: "active",
            Company: userData.company || "",
            Phone: userData.phone || "",
            PartnerType: "individual",
            CommissionTier: "standard",
            OnboardingStatus: "approved",
            CreatedAt: new Date().toISOString()
          }
        };

        const createRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items`, {
          method: "POST",
          headers: {
            ...authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (createRes.ok) {
          const createdItem = await createRes.json();
          console.log(`Created SharePoint Partner record successfully. ID: ${createdItem.id}`);
        } else {
          const errText = await createRes.text();
          console.error(`Failed to create SharePoint Partner record: ${errText}`);
        }
      } else {
        console.log(`Partner ${email} already exists in SharePoint (ID: ${spPartner.id}).`);
        const onboardingStatus = String(spPartner.fields?.OnboardingStatus || "").toLowerCase();
        const status = String(spPartner.fields?.Status || "").toLowerCase();

        if (onboardingStatus !== "approved" || status !== "active") {
          console.log(`Updating SharePoint partner fields to OnboardingStatus='approved' and Status='active'...`);
          const patchRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/lists/${list.id}/items/${spPartner.id}/fields`, {
            method: "PATCH",
            headers: {
              ...authHeader,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              OnboardingStatus: "approved",
              Status: "active"
            })
          });

          if (patchRes.ok) {
            console.log("Successfully updated SharePoint partner record.");
          } else {
            const errText = await patchRes.text();
            console.error(`Failed to update SharePoint partner record: ${errText}`);
          }
        } else {
          console.log("SharePoint partner record is already fully approved and active. No changes needed.");
        }
      }
    }

    console.log("\nReconciliation process completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Critical error in reconciliation:", error);
    process.exit(1);
  }
}

run();
