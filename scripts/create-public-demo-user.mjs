/**
 * create-public-demo-user.mjs
 * Creates/updates a public demo account for external reviewers.
 * Run: node scripts/create-public-demo-user.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_CLIENT_EMAIL) {
  dotenv.config({ path: '.env.production' });
}

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Firebase Admin credentials missing. Check .env.local / .env.production');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

const DEMO_EMAIL = process.env.NEXT_PUBLIC_PUBLIC_DEMO_EMAIL || 'public.demo@mysccg.de';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_PUBLIC_DEMO_PASSWORD || 'PortalDemo2026!';
const DEMO_NAME = process.env.PUBLIC_DEMO_NAME || 'Public ERP Demo User';

async function run() {
  let uid;
  let action = 'created';

  try {
    const existing = await auth.getUserByEmail(DEMO_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
    action = 'updated';
  } catch {
    const created = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_NAME,
      emailVerified: true,
    });
    uid = created.uid;
  }

  // Public demo should be safe and non-admin.
  // "customer" role gives a guided dashboard without admin/partner-side destructive controls.
  await db.collection('users').doc(uid).set(
    {
      uid,
      email: DEMO_EMAIL,
      displayName: DEMO_NAME,
      role: 'customer',
      roles: ['customer'],
      status: 'active',
      company: 'Public Demo Workspace',
      emailVerified: true,
      publicDemo: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(action === 'created' ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  console.log('\n' + '='.repeat(62));
  console.log('PUBLIC ERP DEMO ACCOUNT READY');
  console.log('='.repeat(62));
  console.log(`Status   : ${action.toUpperCase()}`);
  console.log(`UID      : ${uid}`);
  console.log(`Email    : ${DEMO_EMAIL}`);
  console.log(`Password : ${DEMO_PASSWORD}`);
  console.log('Role     : customer');
  console.log('Demo URL : https://portal.mysccg.de/erp-experience');
  console.log('Login URL: https://portal.mysccg.de/login?demo=1');
  console.log('='.repeat(62) + '\n');
}

run().catch((err) => {
  console.error('Failed to create public demo user:', err);
  process.exit(1);
});
