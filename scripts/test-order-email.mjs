import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  const { ConfidentialClientApplication } = await import('@azure/msal-node');
  const { Client } = await import('@microsoft/microsoft-graph-client');

  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const sender = process.env.O365_SENDER_USER_ID || 'portal@mysccg.de';

  const msalConfig = {
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}`, clientSecret },
  };
  const cca = new ConfidentialClientApplication(msalConfig);
  const authRes = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
  const client = Client.init({ authProvider: (done) => done(null, authRes.accessToken) });

  const body = {
    message: {
      subject: 'Test Order Email from scripts/test-order-email.mjs',
      body: { contentType: 'HTML', content: '<p>Test email</p>' },
      toRecipients: [{ emailAddress: { address: 'mhasnainn@gmail.com', name: 'Md Hasnain' } }],
      ccRecipients: [{ emailAddress: { address: 'service@mysccg.de', name: 'SCCG Service Desk' } }],
    },
    saveToSentItems: true,
  };

  console.log(`Sending from /users/${sender}/sendMail ...`);
  try {
    const res = await client.api(`/users/${sender}/sendMail`).post(body);
    console.log('SUCCESS! Result:', res);
  } catch (err) {
    console.error('ERROR status:', err.statusCode, 'code:', err.code, 'message:', err.message);
    if (err.body) console.error('Error body:', err.body);
  }
}

run();
