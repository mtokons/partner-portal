/**
 * Firebase Admin SDK — Server-side only.
 * Single initialization point for all Firestore operations.
 */
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (app) return app;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace escaped newlines from .env file
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] Missing credentials. Using default initialization.");
    app = admin.apps.length > 0 ? admin.apps[0]! : admin.initializeApp({
      projectId: projectId || "sccgport"
    });
    return app;
  }

  try {
    app = admin.apps.length > 0
      ? admin.apps[0]!
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
  } catch (error) {
    console.error("[Firebase Admin] Failed to initialize:", error);
    app = admin.apps.length > 0 ? admin.apps[0]! : admin.initializeApp();
  }

  return app;
}

/** Get the Firestore database instance (server-side only) */
export function getDb(): FirebaseFirestore.Firestore {
  return getApp().firestore();
}

/** Verify a Firebase ID token (server-side only) */
export async function verifyIdToken(idToken: string) {
  return getApp().auth().verifyIdToken(idToken);
}
