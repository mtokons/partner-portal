/**
 * create-school-admin-user.mjs
 * Creates the qa.school@mysccg.de test user with role "school-manager".
 * Run: node scripts/create-school-admin-user.mjs
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

const db   = getFirestore();
const auth = getAuth();

const SCHOOL_ADMIN_USER = {
  email:       'qa.school@mysccg.de',
  password:    'Portal1!',
  displayName: 'QA School Admin',
  role:        'school-manager',
  roles:       ['school-manager'],
};

async function run() {
  const { email, password, displayName, role, roles } = SCHOOL_ADMIN_USER;
  let uid;
  let action = 'created';

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
      uid,
      email,
      displayName,
      phone:         '',
      role,
      roles,
      company:       'SCCG Language School',
      specialization: '',
      photoURL:      '',
      emailVerified: true,
      status:        'active',
      updatedAt:     FieldValue.serverTimestamp(),
      ...(action === 'created' ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  console.log('\n' + '═'.repeat(54));
  console.log('  SCHOOL ADMIN TEST USER');
  console.log('═'.repeat(54));
  console.log(`  Status  : ${action.toUpperCase()}`);
  console.log(`  UID     : ${uid}`);
  console.log(`  Email   : ${email}`);
  console.log(`  Password: Portal1!`);
  console.log(`  Role    : school-manager`);
  console.log(`  Login   : https://portal.mysccg.de/login`);
  console.log('═'.repeat(54) + '\n');
}

run().catch((e) => { console.error(e); process.exit(1); });
