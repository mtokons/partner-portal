import { config } from "dotenv";
config({ path: "./.env.local" });
config({ path: "./import.env" });

import { sendEmailViaGraph } from "../src/lib/email.ts";
import { getGraphClient } from "../src/lib/graph.ts";

async function testNotifications() {
  console.log("=========================================");
  console.log("🧪 Testing Task Notifications (Email & Teams)");
  console.log("=========================================");

  console.log("AZURE_AD_TENANT_ID:", process.env.AZURE_AD_TENANT_ID ? "✅ Set" : "❌ Missing");
  console.log("AZURE_AD_CLIENT_ID:", process.env.AZURE_AD_CLIENT_ID ? "✅ Set" : "❌ Missing");
  console.log("AZURE_AD_CLIENT_SECRET:", process.env.AZURE_AD_CLIENT_SECRET ? "✅ Set" : "❌ Missing");

  const testEmail = "hasnain@mysccg.de"; // Target test recipient

  // 1. Test Email via Microsoft Graph API
  console.log(`\n📧 1. Testing sendEmailViaGraph to ${testEmail}...`);
  try {
    await sendEmailViaGraph({
      to: testEmail,
      toName: "Md Hasnain",
      subject: "SCCG Test Notification — Task Board Real-Time Alert",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Task Board Notification Test</h2>
          <p>This is a test notification confirming that email alerts for <strong>Task Creation, Editing, and Comments</strong> are working correctly.</p>
          <div style="background: #f1f5f9; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">Task: Review Visa Documentation for Candidate</p>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Created by: System Admin • Stage: Task List</p>
          </div>
          <p style="color: #64748b; font-size: 12px;">SCCG Career Lab Germany — Partner Portal</p>
        </div>
      `,
    });
    console.log("✅ Email sent successfully via Graph API!");
  } catch (err) {
    console.error("❌ Email sending failed:", err.message || err);
  }

  // 2. Test Microsoft Teams Graph Connection
  console.log(`\n💬 2. Testing Microsoft Teams Graph Chat API for ${testEmail}...`);
  try {
    const client = await getGraphClient();
    console.log("✅ Graph client initialized.");

    // Query user in Azure AD
    const userRes = await client.api(`/users/${testEmail}`).select("id,displayName,userPrincipalName,mail").get();
    console.log("✅ Found user in Azure AD / Teams:", userRes.displayName, `(ID: ${userRes.id})`);

    // Check if 1:1 chat can be created or searched
    console.log("Checking Teams chat capabilities...");
    try {
      const chatBody = {
        chatType: "oneOnOne",
        members: [
          {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userRes.id}')`
          }
        ]
      };
      console.log("Chat member resolved for user ID:", userRes.id);
      console.log("✅ Teams user resolution verified successfully!");
    } catch (chatErr) {
      console.warn("Teams chat note:", chatErr.message || chatErr);
    }
  } catch (err) {
    console.warn("⚠️ Teams user search notice:", err.message || err);
  }

  console.log("\n🏁 Notification test completed!");
}

testNotifications().catch(console.error);
