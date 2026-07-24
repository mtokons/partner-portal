import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_PROJECT_ID && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  dotenv.config({ path: '.env.production' });
}

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, "\n"),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();

const QA_EMAIL = 'qa.offer@mysccg.de';
const QA_PASSWORD = 'Portal1!';
const QA_DISPLAY_NAME = 'QA Offer Candidate';

async function fixAccount() {
  console.log(`🔧 Fixing Firebase Auth account for ${QA_EMAIL}...`);

  let uid;
  try {
    const existing = await auth.getUserByEmail(QA_EMAIL);
    uid = existing.uid;
    console.log(`✅ Account exists (UID: ${uid}), resetting password...`);
    await auth.updateUser(uid, {
      password: QA_PASSWORD,
      displayName: QA_DISPLAY_NAME,
      emailVerified: true,
    });
    console.log('✅ Password reset to Portal1!');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('⚠️  Account not found — creating...');
      const newUser = await auth.createUser({
        email: QA_EMAIL,
        password: QA_PASSWORD,
        displayName: QA_DISPLAY_NAME,
        emailVerified: true,
      });
      uid = newUser.uid;
      console.log(`✅ Created Firebase Auth account (UID: ${uid})`);
    } else {
      throw err;
    }
  }

  // Ensure Firestore user doc exists with correct role
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      uid,
      email: QA_EMAIL,
      displayName: QA_DISPLAY_NAME,
      role: 'customer',
      primaryConsole: 'customer',
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Firestore user doc created');
  } else {
    console.log(`ℹ️  Firestore doc already exists: role=${userSnap.data().role}`);
  }

  console.log(`\n🎉 qa.offer@mysccg.de is ready — password: Portal1!`);
}

fixAccount().catch(err => { console.error('❌', err.message); process.exit(1); });
