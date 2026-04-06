import * as admin from "firebase-admin";

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  // Support both escaped newlines and literal newlines in the private key, and strip quotes
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, "\n"),
};

export function getAdminApp() {
  if (!admin.apps.length) {
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.warn("Firebase Admin SDK not fully configured. Some server-side features may fail.");
      return null;
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  return admin.app();
}

export async function verifyIdToken(token: string) {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not initialized");
  return admin.auth(app).verifyIdToken(token);
}

export async function setCustomUserClaims(uid: string, claims: object) {
  const app = getAdminApp();
  if (!app) return;
  await admin.auth(app).setCustomUserClaims(uid, claims);
}

export function getAdminFirestore() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not initialized");
  return admin.firestore(app);
}
