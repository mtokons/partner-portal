import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_PROJECT_ID) {
  dotenv.config({ path: '.env.production' });
}

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, "\n"),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("❌ Firebase Admin credentials missing in environment.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const emailToPromote = process.argv[2] || "hasnain@mysccg.de";

async function promoteUser() {
  console.log(`🔍 Searching for user with email: ${emailToPromote}...`);
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', emailToPromote).get();
  
  if (snapshot.empty) {
    console.error(`❌ No user found with email: ${emailToPromote}`);
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  
  console.log(`👤 Found user: ${userData.displayName} (UID: ${userDoc.id})`);
  console.log(`📊 Current Role: ${userData.role}`);
  console.log(`📈 Promoting to 'admin'...`);

  await userDoc.ref.update({
    role: 'admin',
    status: 'active',
    updatedAt: new Date().toISOString()
  });

  console.log(`✅ User ${emailToPromote} successfully promoted to 'admin'!`);
}

promoteUser().catch(err => {
  console.error("❌ Error promoting user:", err);
  process.exit(1);
});
