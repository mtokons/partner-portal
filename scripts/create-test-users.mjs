/**
 * create-test-users.mjs
 * Creates 4 test accounts on Firebase Auth + Firestore for QA / feature testing.
 * Run once: node scripts/create-test-users.mjs
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
  console.error('❌  Firebase Admin credentials missing. Check .env.local / .env.production');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db    = getFirestore();
const auth  = getAuth();

const TEST_USERS = [
  {
    email:       'qa.admin@mysccg.de',
    password:    'Portal1!',
    displayName: 'QA Admin',
    role:        'admin',
    loginUrl:    'https://portal.mysccg.de/login',
  },
  {
    email:       'qa.partner@mysccg.de',
    password:    'Portal1!',
    displayName: 'QA Partner',
    role:        'partner',
    loginUrl:    'https://portal.mysccg.de/login',
  },
  {
    email:       'qa.customer@mysccg.de',
    password:    'Portal1!',
    displayName: 'QA Customer',
    role:        'customer',
    loginUrl:    'https://portal.mysccg.de/login?portal=customer',
  },
  {
    email:       'qa.expert@mysccg.de',
    password:    'Portal1!',
    displayName: 'QA Expert',
    role:        'expert',
    loginUrl:    'https://portal.mysccg.de/login?portal=expert',
  },
];

async function upsertUser({ email, password, displayName, role, loginUrl }) {
  let uid;
  let action = 'created';

  try {
    // Try to fetch existing user first (idempotent)
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    // Update password in case it changed
    await auth.updateUser(uid, { password, displayName, emailVerified: true });
    action = 'updated';
  } catch {
    // User does not exist → create it
    const created = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,   // skip email verification for test accounts
    });
    uid = created.uid;
  }

  // Upsert Firestore profile
  await db.collection('users').doc(uid).set(
    {
      uid,
      email,
      displayName,
      phone:         '',
      role,
      company:       role === 'partner' ? 'QA Partner Co.' : '',
      specialization: role === 'expert' ? 'Test Specialization' : '',
      photoURL:      '',
      emailVerified: true,
      status:        'active',
      updatedAt:     FieldValue.serverTimestamp(),
      // Only set createdAt on first write
      ...(action === 'created' ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  return { uid, action, email, loginUrl };
}

async function run() {
  console.log('\n🔧  Creating / updating test users...\n');

  const results = [];
  for (const u of TEST_USERS) {
    try {
      const r = await upsertUser(u);
      console.log(`  ✅  ${r.action.padEnd(8)} → ${r.email}  (uid: ${r.uid})`);
      results.push({ ...u, uid: r.uid });
    } catch (err) {
      console.error(`  ❌  FAILED  → ${u.email}: ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(62));
  console.log('  TEST USER CREDENTIALS');
  console.log('─'.repeat(62));
  console.log(`  Password (all accounts):  Portal1!\n`);
  for (const u of results) {
    console.log(`  Role     : ${u.role.toUpperCase()}`);
    console.log(`  Email    : ${u.email}`);
    console.log(`  Login at : ${u.loginUrl}`);
    console.log('');
  }
  console.log('─'.repeat(62));
  console.log('  ⚠️   These are TEST accounts — do not use in production data.\n');
}

run().catch((err) => {
  console.error('\n❌  Unhandled error:', err);
  process.exit(1);
});
