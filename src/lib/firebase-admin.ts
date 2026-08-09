import * as admin from "firebase-admin";

function cleanEnv(value?: string): string | undefined {
  const cleaned = value?.trim().replace(/^['"]|['"]$/g, "");
  return cleaned || undefined;
}

function getServiceAccount() {
  const projectId = cleanEnv(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT
  );
  const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const encodedKey = cleanEnv(process.env.FIREBASE_PRIVATE_KEY_BASE64);
  const privateKey = encodedKey
    ? Buffer.from(encodedKey, "base64").toString("utf8")
    : cleanEnv(process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

export function getAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.projectId,
      });
    }

    // Supports VPS/VM deployments using GOOGLE_APPLICATION_CREDENTIALS or a
    // workload identity instead of copying a private key into .env.production.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_USE_APPLICATION_DEFAULT === "true") {
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: serviceAccount.projectId,
      });
    }

    console.error(
      "Firebase Admin SDK is not configured. Set FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID), FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY/FIREBASE_PRIVATE_KEY_BASE64, or configure GOOGLE_APPLICATION_CREDENTIALS."
    );
    return null;
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

let _firestoreSettingsApplied = false;

export function getAdminFirestore() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not initialized");
  const fs = admin.firestore(app);
  if (!_firestoreSettingsApplied) {
    try {
      fs.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings already applied — safe to ignore
    }
    _firestoreSettingsApplied = true;
  }
  return fs;
}
