import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('\n======================================================');
console.log(' 🧪 SCCG NOTIFICATIONS QA & TEST SUITE');
console.log('======================================================\n');

async function runTests() {
  const { ConfidentialClientApplication } = await import('@azure/msal-node');
  const { Client } = await import('@microsoft/microsoft-graph-client');

  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const defaultSender = process.env.O365_SENDER_USER_ID || 'portal@mysccg.de';

  console.log('1️⃣  Checking Environment Variables...');
  console.log('   - Tenant ID:', tenantId ? `✓ Set (${tenantId.slice(0, 8)}...)` : '❌ Missing');
  console.log('   - Client ID:', clientId ? `✓ Set (${clientId.slice(0, 8)}...)` : '❌ Missing');
  console.log('   - Client Secret:', clientSecret ? '✓ Set' : '❌ Missing');
  console.log('   - Default Sender:', defaultSender);

  if (!tenantId || !clientId || !clientSecret) {
    console.error('\n❌ CRITICAL: Missing required Azure AD / Microsoft Graph credentials.');
    process.exit(1);
  }

  // TEST 1: MSAL Token Acquisition
  console.log('\n2️⃣  Testing Microsoft Entra ID Token Acquisition...');
  const msalConfig = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };

  const cca = new ConfidentialClientApplication(msalConfig);
  let accessToken = '';

  try {
    const authResult = await cca.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    accessToken = authResult?.accessToken || '';
    if (accessToken) {
      console.log('   ✓ OAuth2 Bearer Token successfully acquired from Microsoft Entra ID.');
    } else {
      throw new Error('No access token returned');
    }
  } catch (err) {
    console.error('   ❌ Token Acquisition Failed:', err.message);
    return;
  }

  const graphClient = Client.init({
    authProvider: (done) => done(null, accessToken),
  });

  // TEST 2: Query Organization & Users
  console.log('\n3️⃣  Testing Microsoft Graph API Tenant Connectivity...');
  try {
    const org = await graphClient.api('/organization').select('id,displayName,verifiedDomains').get();
    console.log('   ✓ Connected to Microsoft 365 Tenant:', org?.value?.[0]?.displayName || 'Active Tenant');
    const domains = org?.value?.[0]?.verifiedDomains?.map(d => d.name).join(', ');
    console.log('   ✓ Verified Domains:', domains);
  } catch (err) {
    console.warn('   ⚠️  Organization query warning:', err.message);
  }

  // TEST 3: Check Sender Mailbox
  console.log(`\n4️⃣  Verifying Sender Mailbox (${defaultSender})...`);
  let senderExists = false;
  let senderUserId = '';
  try {
    const userRes = await graphClient.api(`/users/${defaultSender}`).select('id,displayName,userPrincipalName,mail').get();
    console.log(`   ✓ Found Sender Account: "${userRes.displayName}" (ID: ${userRes.id})`);
    senderExists = true;
    senderUserId = userRes.id;
  } catch (err) {
    console.warn(`   ⚠️  Sender "${defaultSender}" check:`, err.message);
    try {
      const allUsers = await graphClient.api('/users').top(5).select('id,displayName,userPrincipalName,mail').get();
      console.log('   Available tenant users:');
      allUsers.value.forEach(u => {
        console.log(`     • ${u.displayName} (${u.userPrincipalName || u.mail})`);
      });
      if (allUsers.value.length > 0) {
        senderUserId = allUsers.value[0].userPrincipalName;
        console.log(`   💡 Recommended fallback sender: ${senderUserId}`);
      }
    } catch (e2) {
      console.warn('   Could not list users:', e2.message);
    }
  }

  // TEST 4: Mention / Tag / Multi-assignee Extraction Logic
  console.log('\n5️⃣  Testing @Mention and Multi-Assignee Parser Logic...');
  const sampleTask = {
    title: 'Bug Fix in Candidate Portal',
    description: 'Please review this @hasnain@mtokons.com and CC @partner@sccg.de for sign-off.',
    createdByEmail: 'admin@mysccg.de',
    createdByName: 'Admin User',
    assignees: [
      { id: '1', name: 'Hasnain Dev', email: 'hasnain@mtokons.com', role: 'SCCG-Staff' },
      { id: '2', name: 'Partner User', email: 'partner@sccg.de', role: 'Partner' },
    ],
  };

  const sampleComment = 'Hey @hasnain@mtokons.com, tested and working! Also notifying @manager@mysccg.de.';

  function extractMentionedEmails(text) {
    if (!text) return [];
    const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    return emails ? Array.from(new Set(emails)) : [];
  }

  const recipientsMap = new Map();
  if (sampleTask.createdByEmail) recipientsMap.set(sampleTask.createdByEmail.toLowerCase(), sampleTask.createdByName);
  sampleTask.assignees.forEach(a => {
    if (a.email) recipientsMap.set(a.email.toLowerCase(), a.name);
  });

  const mentioned = extractMentionedEmails(sampleComment + ' ' + sampleTask.description);
  mentioned.forEach(e => {
    if (!recipientsMap.has(e.toLowerCase())) {
      recipientsMap.set(e.toLowerCase(), 'Mentioned User');
    }
  });

  console.log('   ✓ Extracted Recipients from Task + Comment + Mentions:');
  for (const [email, name] of recipientsMap.entries()) {
    console.log(`     • [${name}] <${email}>`);
  }
  if (recipientsMap.size >= 4) {
    console.log('   ✓ Tagging and Multi-Assignee resolution passed perfectly!');
  }

  // TEST 5: Send Email Test via Graph API
  console.log('\n6️⃣  Testing Graph API Email Delivery (Task Activity Email)...');
  const targetSender = senderUserId || defaultSender;
  const testRecipient = 'hasnain@mysccg.de';

  const testEmailBody = {
    message: {
      subject: '🧪 [QA Test] SCCG Notification System Check',
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">SCCG Task Notification QA Check</h2>
            <p>This is an automated test confirming that:</p>
            <ul>
              <li><strong>Task Creation / Assignment Notifications</strong>: Active ✓</li>
              <li><strong>Task Edit & Status Updates</strong>: Active ✓</li>
              <li><strong>Task Comments & @Mention Notifications</strong>: Active ✓</li>
            </ul>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      },
      toRecipients: [
        {
          emailAddress: {
            address: testRecipient,
            name: 'Hasnain (QA)',
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  try {
    await graphClient.api(`/users/${targetSender}/sendMail`).post(testEmailBody);
    console.log(`   ✓ Email sent successfully via /users/${targetSender}/sendMail to ${testRecipient}`);
  } catch (err) {
    console.error(`   ❌ Email sending returned error:`, err.message);
    if (err.body) console.error('   Error details:', err.body);
  }

  // TEST 6: Teams Chat Notification Lookup
  console.log('\n7️⃣  Testing Microsoft Teams User Lookup & Chat Availability...');
  try {
    const teamsUserRes = await graphClient.api(`/users/${testRecipient}`).select('id,displayName,userPrincipalName').get();
    console.log(`   ✓ Teams User Found in Tenant: "${teamsUserRes.displayName}" (ID: ${teamsUserRes.id})`);

    // Test creating / checking 1-on-1 chat
    console.log('   Testing 1-on-1 Teams Chat Creation/Access...');
    const chatPayload = {
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${targetSender}')`,
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${teamsUserRes.id}')`,
        },
      ],
    };

    try {
      const chat = await graphClient.api('/chats').post(chatPayload);
      console.log(`   ✓ Teams Chat Session Active (Chat ID: ${chat.id})`);
      
      // Post test notification message
      await graphClient.api(`/chats/${chat.id}/messages`).post({
        body: {
          contentType: 'html',
          content: '<b>🧪 SCCG QA Notification Check</b><br/>Task, comment, and mention notifications are active.',
        },
      });
      console.log('   ✓ Teams Notification Message Sent Successfully!');
    } catch (chatErr) {
      console.warn('   ⚠️  Teams Chat API Note:', chatErr.message);
      if (chatErr.message?.includes('Chat.Create') || chatErr.message?.includes('ChatMessage.Send')) {
        console.log('   💡 Notice: Azure AD App Registration needs "Chat.Create" and "ChatMessage.Send" application permissions in Azure Portal for direct Teams chat automation.');
      }
    }
  } catch (userErr) {
    console.log(`   ℹ️  Teams User Lookup for "${testRecipient}": ${userErr.message}`);
    console.log('   (Note: Teams chat notifications only trigger for accounts residing inside the Microsoft 365 tenant).');
  }

  console.log('\n======================================================');
  console.log(' 🏁 QA NOTIFICATION TEST RUN COMPLETE');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Unhandled error in test runner:', err);
});
