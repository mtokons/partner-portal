/**
 * seed-candidate-scenarios.mjs
 *
 * Creates 2 test customer accounts demonstrating the 2 candidate scenarios:
 *
 *  Scenario A — "offer-only" (qa.offer@mysccg.de)
 *    Firebase: customer, active
 *    SharePoint: Customer record + SalesOffer (status=sent) → clientEmail=their email
 *    Portal context: "offer-only"  → amber banner + Offers link
 *
 *  Scenario B — "registered" (qa.active@mysccg.de)
 *    Firebase: customer, active
 *    SharePoint: Customer record + Candidate record + CandidateService record
 *    Portal context: "active" → My Registrations list + Timeline link
 *
 * Run: node scripts/seed-candidate-scenarios.mjs
 */

import * as dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_CLIENT_EMAIL) dotenv.config({ path: '.env.production' });

// ─── Firebase Admin ───────────────────────────────────────────────────────────

const sa = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n'),
};
if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
  console.error('❌  Firebase Admin credentials missing.'); process.exit(1);
}
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db   = getFirestore();
const auth = getAuth();

// ─── Microsoft Graph (SharePoint) ────────────────────────────────────────────

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
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );
  const json = await res.json();
  if (!json.access_token) throw new Error('Token fetch failed: ' + JSON.stringify(json));
  _accessToken = json.access_token;
  return _accessToken;
}

async function graphGet(path) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Allow filtering on non-indexed columns (small lists are fine)
      Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${text}`);
  }
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
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ─── SharePoint helpers ───────────────────────────────────────────────────────

// SITE_ID may be "tenant.sharepoint.com,siteId,webId" — Graph wants just the /sites/{siteId}
function buildSiteBase() {
  // Graph accepts /sites/{hostname},{spSiteId},{spWebId} directly
  return `/sites/${SITE_ID}`;
}

async function getListUrl(listName) {
  const lists = await graphGet(`${buildSiteBase()}/lists?$filter=displayName eq '${encodeURIComponent(listName)}'`);
  const id = lists.value?.[0]?.id;
  if (!id) throw new Error(`SharePoint list not found: "${listName}"`);
  return `${buildSiteBase()}/lists/${id}/items`;
}

async function spCreate(listName, fields) {
  const listUrl = await getListUrl(listName);
  const res = await graphPost(listUrl, { fields });
  return res.id || res.fields?.id;
}

async function findPartnerSPId(email) {
  const lists = await graphGet(`${buildSiteBase()}/lists?$filter=displayName eq 'Partners'`);
  const listId = lists.value?.[0]?.id;
  if (!listId) return null;
  const items = await graphGet(
    `${buildSiteBase()}/lists/${listId}/items?$expand=fields&$filter=fields/Email eq '${email}'&$top=1`
  );
  return items.value?.[0]?.id || null;
}

async function findCustomerSPId(email, listName) {
  const lists = await graphGet(`${buildSiteBase()}/lists?$filter=displayName eq '${encodeURIComponent(listName)}'`);
  const listId = lists.value?.[0]?.id;
  if (!listId) return null;
  const items = await graphGet(
    `${buildSiteBase()}/lists/${listId}/items?$expand=fields&$filter=fields/Email eq '${email}'&$top=1`
  );
  return items.value?.[0]?.id || null;
}

// ─── Firebase helpers ─────────────────────────────────────────────────────────

async function upsertFirebaseUser({ email, password, displayName, role }) {
  let uid, action = 'created';
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName, emailVerified: true });
    action = 'updated';
  } catch {
    const created = await auth.createUser({ email, password, displayName, emailVerified: true });
    uid = created.uid;
  }
  await db.collection('users').doc(uid).set(
    {
      uid, email, displayName, phone: '', role, company: '', specialization: '',
      photoURL: '', emailVerified: true, status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
      ...(action === 'created' ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );
  return { uid, action };
}

// ─── Find the Clients list name (might be "Clients" or "SCCG Client") ────────

async function resolveClientsListName() {
  for (const name of ['Clients', 'SCCG Client']) {
    try {
      await getListUrl(name);
      return name;
    } catch { /* not found */ }
  }
  throw new Error('Cannot find Clients/SCCG Client list in SharePoint');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PASSWORD = 'Portal1!';
const NOW      = new Date().toISOString();

const OFFER_EMAIL    = 'qa.offer@mysccg.de';
const ACTIVE_EMAIL   = 'qa.active@mysccg.de';

async function run() {
  console.log('\n🔧  Seeding candidate test scenarios...\n');

  // 1. Find admin/main partner SP id (to link Customer + Candidate records)
  console.log('  📋  Looking up admin partner in SharePoint...');
  let partnerSPId = await findPartnerSPId('hasnain@mysccg.de');
  if (!partnerSPId) {
    // Try the QA partner if the main one isn't in SP yet
    partnerSPId = await findPartnerSPId('qa.partner@mysccg.de');
  }
  const partnerId = partnerSPId || 'demo-partner';
  const partnerName = partnerSPId ? 'SCCG Admin' : 'Demo Partner';
  console.log(`  ✅  Partner SP id: ${partnerId} (${partnerName})\n`);

  // ── Resolve Client list name ──────────────────────────────────────────────
  const clientsListName = await resolveClientsListName();
  console.log(`  📋  Using clients list: "${clientsListName}"\n`);

  // ═══════════════════════════════════════════════════════════════
  // SCENARIO A — offer-only candidate
  // ═══════════════════════════════════════════════════════════════
  console.log('  ── Scenario A: offer-only candidate ──');

  // Firebase
  const { uid: offerUid, action: a1 } = await upsertFirebaseUser({
    email: OFFER_EMAIL, password: PASSWORD,
    displayName: 'QA Offer Candidate', role: 'customer',
  });
  console.log(`  ✅  Firebase ${a1}: ${OFFER_EMAIL} (uid: ${offerUid})`);

  // SP Customer record (so portal can link to partner)
  let offerCustomerId = await findCustomerSPId(OFFER_EMAIL, clientsListName);
  if (!offerCustomerId) {
    const isLegacy = clientsListName === 'SCCG Client';
    offerCustomerId = await spCreate(clientsListName, isLegacy
      ? { Title: 'QA Offer Candidate', field_4: OFFER_EMAIL, field_3: '+00000000001' }
      : { Name: 'QA Offer Candidate', Email: OFFER_EMAIL, Phone: '+00000000001',
          Company: 'Test Co.', PartnerId: partnerId, CreatedAt: NOW }
    );
    console.log(`  ✅  SP Customer created (id: ${offerCustomerId})`);
  } else {
    console.log(`  ℹ️   SP Customer already exists (id: ${offerCustomerId})`);
  }

  // SP SalesOffer (status=sent so it shows up in getMyOffers)
  const offerNumber = `SO-QA-${Date.now().toString().slice(-5)}`;
  const offerValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const salesOfferId = await spCreate('SalesOffers', {
    OfferNumber:  offerNumber,
    PartnerId:    partnerId,
    PartnerName:  partnerName,
    ClientId:     offerCustomerId || '',
    ClientName:   'QA Offer Candidate',
    ClientEmail:  OFFER_EMAIL,
    Status:       'sent',
    Subtotal:     1200,
    Discount:     0,
    DiscountType: 'fixed',
    TotalAmount:  1200,
    ValidUntil:   offerValidUntil,
    Notes:        'QA test offer — Scenario A (offer-only portal view)',
    CreatedBy:    'qa-seed-script',
    CreatedAt:    NOW,
    UpdatedAt:    NOW,
    SentAt:       NOW,
  });
  console.log(`  ✅  SP SalesOffer created (${offerNumber}, id: ${salesOfferId})\n`);

  // ═══════════════════════════════════════════════════════════════
  // SCENARIO B — partner-registered candidate
  // ═══════════════════════════════════════════════════════════════
  console.log('  ── Scenario B: partner-registered (active) candidate ──');

  // Firebase
  const { uid: activeUid, action: a2 } = await upsertFirebaseUser({
    email: ACTIVE_EMAIL, password: PASSWORD,
    displayName: 'QA Active Candidate', role: 'customer',
  });
  console.log(`  ✅  Firebase ${a2}: ${ACTIVE_EMAIL} (uid: ${activeUid})`);

  // SP Customer record
  let activeCustomerId = await findCustomerSPId(ACTIVE_EMAIL, clientsListName);
  if (!activeCustomerId) {
    const isLegacy = clientsListName === 'SCCG Client';
    activeCustomerId = await spCreate(clientsListName, isLegacy
      ? { Title: 'QA Active Candidate', field_4: ACTIVE_EMAIL, field_3: '+00000000002' }
      : { Name: 'QA Active Candidate', Email: ACTIVE_EMAIL, Phone: '+00000000002',
          Company: 'Test Co.', PartnerId: partnerId, CreatedAt: NOW }
    );
    console.log(`  ✅  SP Customer created (id: ${activeCustomerId})`);
  } else {
    console.log(`  ℹ️   SP Customer already exists (id: ${activeCustomerId})`);
  }

  // SP Candidate record
  const sccgId = `CAND-QA-${Date.now().toString().slice(-5)}`;
  const candidateId = await spCreate('Candidates', {
    SccgId:           sccgId,
    PartnerId:        partnerId,
    PartnerName:      partnerName,
    WorkflowCategory: 'Training & Language',
    CurrentStatus:    'REGISTERED',
    Title:            'QA Active Candidate',       // fullName maps to Title
    DateOfBirth:      '1995-01-01',
    Email:            ACTIVE_EMAIL,
    Phone:            '+00000000002',
    Nationality:      'German',
    Country:          'Germany',
    TotalServiceFee:  2400,
    SccgShare:        1440,
    PartnerShare:     960,
    DepositAmount:    720,
    MarginPercentage: 20,
    PaymentStatus:    'deposit-paid',
    PaymentMethod:    'bank-transfer',
    Notes:            'QA test candidate — Scenario B (registered portal view)',
    CreatedBy:        'qa-seed-script',
    CreatedAt:        NOW,
    SubmittedAt:      NOW,
  });
  console.log(`  ✅  SP Candidate created (${sccgId}, id: ${candidateId})`);

  // SP CandidateService record — use CANDS_COL field names from sharepoint.ts
  const serviceId = await spCreate('CandidateServices', {
    CandidateId:        candidateId,
    Title:              'German A1 Language Course',
    ServicePricingId:   'qa-pricing-001',
    PackageType:        'all-inclusive',
    WorkflowCategory:   'Training & Language',
    CurrentStatus:      'REGISTERED',
    BasePrice:          800,
    Quantity:           1,
    TotalPrice:         800,
    CreatedAt:          NOW,
  });
  console.log(`  ✅  SP CandidateService created (id: ${serviceId})\n`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  const W = 64;
  console.log('─'.repeat(W));
  console.log('  TEST CANDIDATE SCENARIOS');
  console.log('─'.repeat(W));
  console.log(`  Password (both accounts):  ${PASSWORD}\n`);

  console.log('  📨  SCENARIO A — Offer Only (prospect candidate)');
  console.log(`  Email    : ${OFFER_EMAIL}`);
  console.log(`  Login at : https://portal.mysccg.de/login?portal=customer`);
  console.log('  Portal   : Sees amber "pending offers" banner, Offer list link');
  console.log('             Can browse offer details, no timeline/services yet\n');

  console.log('  ✅  SCENARIO B — Registered Candidate (active / partner-registered)');
  console.log(`  Email    : ${ACTIVE_EMAIL}`);
  console.log(`  Login at : https://portal.mysccg.de/login?portal=customer`);
  console.log('  Portal   : Sees My Registrations, Journey Snapshot, Timeline link');
  console.log('             Full service details, payment status visible\n');
  console.log('─'.repeat(W));
  console.log('  ⚠️   These are QA accounts — do not use for real candidate data.\n');
}

run().catch(err => { console.error('\n❌  Error:', err); process.exit(1); });
