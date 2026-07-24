/**
 * create-test-partners.mjs
 *
 * Creates/updates four partner test users in Firebase Auth + Firestore,
 * and ensures matching SharePoint Partners records are active + approved.
 *
 * Run: node scripts/create-test-partners.mjs
 */

import * as dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.AZURE_AD_TENANT_ID) {
  dotenv.config({ path: '.env.production' });
}

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n'),
};

const TENANT_ID = process.env.AZURE_AD_TENANT_ID?.replace(/^"|"$/g, '');
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID?.replace(/^"|"$/g, '');
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET?.replace(/^"|"$/g, '');
const SITE_ID = process.env.SHAREPOINT_SITE_ID?.replace(/^"|"$/g, '');

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('❌ Firebase Admin credentials missing. Check .env.local / .env.production');
  process.exit(1);
}

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_ID) {
  console.error('❌ Azure AD / SharePoint credentials missing. Check .env.local / .env.production');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();

const PASSWORD = 'Portal1!';
const TEST_PARTNERS = [
  { key: 'edukraft', displayName: 'Edukraft', company: 'Edukraft', email: 'test.edukraft@mysccg.de', partnerCode: 'PRT-EDUKRAFT-01', tierStatus: 'Silver', marginPercentage: 10 },
  { key: 'eduquest', displayName: 'Eduquest', company: 'Eduquest', email: 'test.eduquest@mysccg.de', partnerCode: 'PRT-EDUQUEST-01', tierStatus: 'Silver', marginPercentage: 10 },
  { key: 'eduseed', displayName: 'EduSeed', company: 'EduSeed', email: 'test.eduseed@mysccg.de', partnerCode: 'PRT-EDUSEED-01', tierStatus: 'Silver', marginPercentage: 10 },
  { key: 'broadmind', displayName: 'Broadmind', company: 'Broadmind', email: 'test.broadmind@mysccg.de', partnerCode: 'PRT-BROADMIND-01', tierStatus: 'Silver', marginPercentage: 10 },
];

let _accessToken = null;

function siteBase() {
  return `/sites/${SITE_ID}`;
}

async function getToken() {
  if (_accessToken) return _accessToken;
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Token fetch failed: ${JSON.stringify(json)}`);
  }
  _accessToken = json.access_token;
  return _accessToken;
}

async function graphGet(path) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
    },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function graphPost(path, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function graphPatch(path, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}: ${await res.text()}`);
}

async function getPartnersListId() {
  const lists = await graphGet(`${siteBase()}/lists?$filter=displayName eq 'Partners'`);
  const id = lists.value?.[0]?.id;
  if (!id) throw new Error('SharePoint list not found: Partners');
  return id;
}

async function findPartnerByEmail(listId, email) {
  const items = await graphGet(
    `${siteBase()}/lists/${listId}/items?$expand=fields&$filter=fields/Email eq '${email}'&$top=1`
  );
  return items.value?.[0] || null;
}

async function upsertFirebaseUser(partner) {
  let uid;
  let action = 'created';

  try {
    const existing = await auth.getUserByEmail(partner.email);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: PASSWORD,
      displayName: partner.displayName,
      emailVerified: true,
    });
    action = 'updated';
  } catch {
    const created = await auth.createUser({
      email: partner.email,
      password: PASSWORD,
      displayName: partner.displayName,
      emailVerified: true,
    });
    uid = created.uid;
  }

  await db.collection('users').doc(uid).set(
    {
      uid,
      email: partner.email,
      displayName: partner.displayName,
      phone: '',
      role: 'partner',
      company: partner.company,
      specialization: '',
      photoURL: '',
      emailVerified: true,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
      ...(action === 'created' ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  return { uid, action };
}

async function upsertSharePointPartner(listId, partner) {
  const existing = await findPartnerByEmail(listId, partner.email);
  const now = new Date().toISOString();

  const fields = {
    Title: partner.displayName,
    Email: partner.email,
    PasswordHash: '',
    Role: 'partner',
    Status: 'active',
    Company: partner.company,
    Phone: '',
    PartnerType: 'individual',
    PartnerCode: partner.partnerCode,
    CommissionTier: 'standard',
    TierStatus: partner.tierStatus,
    MarginPercentage: partner.marginPercentage,
    OnboardingStatus: 'approved',
    CreatedAt: now,
  };

  if (existing?.id) {
    await graphPatch(`${siteBase()}/lists/${listId}/items/${existing.id}/fields`, fields);
    return { action: 'updated', id: existing.id };
  }

  const created = await graphPost(`${siteBase()}/lists/${listId}/items`, { fields });
  return { action: 'created', id: created.id };
}

async function run() {
  console.log('\n🔧 Creating/updating test partner users...\n');

  const partnersListId = await getPartnersListId();
  const output = [];

  for (const partner of TEST_PARTNERS) {
    try {
      const fb = await upsertFirebaseUser(partner);
      const sp = await upsertSharePointPartner(partnersListId, partner);

      output.push({
        ...partner,
        firebaseUid: fb.uid,
        firebaseAction: fb.action,
        spAction: sp.action,
        spId: sp.id,
      });

      console.log(`✅ ${partner.displayName.padEnd(10)} | firebase=${fb.action} | sharepoint=${sp.action} (id=${sp.id})`);
    } catch (err) {
      console.error(`❌ ${partner.displayName}: ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(78));
  console.log('  PARTNER TEST USERS');
  console.log('─'.repeat(78));
  console.log(`  Password (all): ${PASSWORD}\n`);

  for (const row of output) {
    console.log(`  Partner   : ${row.displayName}`);
    console.log(`  Email     : ${row.email}`);
    console.log(`  Login URL : https://portal.mysccg.de/login`);
    console.log(`  SP ID     : ${row.spId}`);
    console.log('');
  }

  console.log('─'.repeat(78));
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
