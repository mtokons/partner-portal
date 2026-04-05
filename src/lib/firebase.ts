// @ts-nocheck
/**
 * Firebase Configuration — Free Tier Fallback
 *
 * This module provides Firebase Auth as a fallback authentication option
 * and Firestore for lightweight real-time features.
 *
 * USAGE:
 *   - Import { firebaseAuth, db } from "@/lib/firebase"
 *   - Use only when SharePoint/Graph API auth is not available
 *   - Firebase Free Tier limits: 50k reads/day, 20k writes/day, 1GB storage
 *
 * SETUP:
 *   1. Go to https://console.firebase.google.com/
 *   2. Create a new project (e.g. "partner-portal")
 *   3. Enable Authentication > Email/Password
 *   4. Enable Firestore Database (Start in test mode for dev)
 *   5. Copy config values to .env.local
 */

// Only import firebase on the client side or when explicitly needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null;

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

export async function getFirebaseApp() {
  if (app) return app;
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const config = getFirebaseConfig();
  if (!config.apiKey) {
    throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  app = getApps().length > 0 ? getApp() : initializeApp(config);
  return app;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFirebaseAuth(): Promise<any> {
  const { getAuth } = await import("firebase/auth");
  const firebaseApp = await getFirebaseApp();
  return getAuth(firebaseApp);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFirestore(): Promise<any> {
  const { getFirestore: getFs } = await import("firebase/firestore");
  const firebaseApp = await getFirebaseApp();
  return getFs(firebaseApp);
}

/**
 * Check if Firebase is configured (env vars present).
 * Use this to decide whether to show Firebase login options.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}
