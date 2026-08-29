import fs from "fs";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

// Read import.env manually
const envContent = fs.readFileSync("./import.env", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const tenantId = envVars.AZURE_AD_TENANT_ID;
const clientId = envVars.AZURE_AD_CLIENT_ID;
const clientSecret = envVars.AZURE_AD_CLIENT_SECRET;

console.log("Tenant:", tenantId ? "OK" : "Missing");
console.log("Client ID:", clientId ? "OK" : "Missing");

const cca = new ConfidentialClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret,
  },
});

async function main() {
  const tokenRes = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  console.log("✅ MSAL Token acquired successfully!");

  const client = Client.init({
    authProvider: (done) => done(null, tokenRes.accessToken),
  });

  const testEmail = "hasnain@mysccg.de";
  console.log(`\n📧 Testing sending email to ${testEmail}...`);
  try {
    const sender = "portal@mysccg.de";
    await client.api(`/users/${sender}/sendMail`).post({
      message: {
        subject: "SCCG Test Notification — Task Board Real-Time Alert",
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5; margin-top: 0;">Task Board Notification Test</h2>
              <p>This is a real-time notification confirming that email alerts for <strong>Task Creation, Editing, and Comments</strong> are fully operational.</p>
              <div style="background: #f1f5f9; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold;">Task: Review Visa Documentation for Candidate</p>
                <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Created by: System Admin • Stage: Task List</p>
              </div>
              <p style="color: #64748b; font-size: 12px;">SCCG Career Lab Germany — Partner Portal</p>
            </div>
          `,
        },
        toRecipients: [{ emailAddress: { address: testEmail, name: "Md Hasnain" } }],
      },
      saveToSentItems: true,
    });
    console.log("✅ Email sent successfully via Microsoft Graph API!");
  } catch (err) {
    console.error("Email send note:", err.message || err);
  }

  console.log(`\n💬 Testing user lookup for Teams message...`);
  try {
    const userRes = await client.api(`/users/${testEmail}`).select("id,displayName,userPrincipalName").get();
    console.log("✅ Found User in Azure AD:", userRes.displayName, `(ID: ${userRes.id})`);
  } catch (err) {
    console.warn("User lookup note:", err.message || err);
  }
}

main().catch(console.error);
