/**
 * seed-qa-partner.mjs
 *
 * Creates a SharePoint Partners record for qa.partner@mysccg.de with
 * onboardingStatus=approved so the partner portal works without the
 * "pending" redirect.
 *
 * Idempotent — safe to run multiple times.
 *
 * Run: node scripts/seed-qa-partner.mjs
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.AZURE_AD_TENANT_ID) dotenv.config({ path: '.env.production' });

const TENANT_ID     = process.env.AZURE_AD_TENANT_ID?.replace(/^"|"$/g, '');
const CLIENT_ID     = process.env.AZURE_AD_CLIENT_ID?.replace(/^"|"$/g, '');
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET?.replace(/^"|"$/g, '');
const SITE_ID       = process.env.SHAREPOINT_SITE_ID?.replace(/^"|"$/g, '');

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_ID) {
  console.error('❌  Azure AD / SharePoint env vars missing.'); process.exit(1);
}

let _accessToken = null;
async function getToken() {
  if (_accessToken) return _accessToken;
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );
  const json = await res.json();
  if (!json.access_token) throw new Error('Token fetch failed: ' + JSON.stringify(json));
  _accessToken = json.access_token;
  return _accessToken;
}

function siteBase() { return `/sites/${SITE_ID}`; }

async function graphGet(path) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
    },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function graphPost(path, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function getListUrl(listName) {
  const lists = await graphGet(`${siteBase()}/lists?$filter=displayName eq '${encodeURIComponent(listName)}'`);
  const id = lists.value?.[0]?.id;
  if (!id) throw new Error(`SharePoint list not found: "${listName}"`);
  return `${siteBase()}/lists/${id}/items`;
}

async function findPartner(email) {
  const lists = await graphGet(`${siteBase()}/lists?$filter=displayName eq 'Partners'`);
  const listId = lists.value?.[0]?.id;
  if (!listId) return null;
  const items = await graphGet(
    `${siteBase()}/lists/${listId}/items?$expand=fields&$filter=fields/Email eq '${email}'&$top=1`
  );
  return items.value?.[0] || null;
}

async function run() {
  const EMAIL = 'qa.partner@mysccg.de';

  console.log('\n🔧  Seeding SharePoint partner record for', EMAIL, '...\n');

  // Check if already exists
  const existing = await findPartner(EMAIL);
  if (existing) {
    const status = existing.fields?.OnboardingStatus || 'unknown';
    console.log(`  ℹ️  Partner record already exists (id=${existing.id}, onboardingStatus=${status})`);
    if (status !== 'approved') {
      console.log('  ⚠️  OnboardingStatus is not "approved" — record exists but may still redirect to pending.');
    } else {
      console.log('  ✅  Partner record is fully set up. Nothing to do.');
    }
    return;
  }

  // Create SP Partners record
  const listUrl = await getListUrl('Partners');
  const now = new Date().toISOString();
  const res = await graphPost(listUrl, {
    fields: {
      Title:            'QA Partner',
      Email:            EMAIL,
      PasswordHash:     '',            // Firebase auth — no password hash needed
      Role:             'partner',
      Status:           'active',
      Company:          'QA Partner Co.',
      Phone:            '',
      PartnerType:      'individual',
      PartnerCode:      'PRT-QA-TEST01',
      CommissionTier:   'standard',
      TierStatus:       'Silver',
      MarginPercentage: 10,
      OnboardingStatus: 'approved',
      CreatedAt:        now,
    },
  });

  console.log(`  ✅  Created SP Partners record → id=${res.id}`);
  console.log(`  Email            : ${EMAIL}`);
  console.log(`  OnboardingStatus : approved`);
  console.log(`  Status           : active`);
  console.log(`  PartnerCode      : PRT-QA-TEST01`);
  console.log('');
  console.log('  ✅  qa.partner@mysccg.de can now access /partner/dashboard');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
