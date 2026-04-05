/**
 * Firebase Configuration — Client-side SDK
 *
 * Provides Firebase Auth and Firestore for:
 *   - User authentication (email/password, password reset, email verification)
 *   - Firestore for user profiles, activity logs
 *
 * SETUP:
 *   1. https://console.firebase.google.com/ → create project
 *   2. Enable Authentication → Email/Password
 *   3. Enable Firestore Database
 *   4. Copy web app config to .env.local (NEXT_PUBLIC_FIREBASE_*)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore as getFs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

// ── Firebase App Singleton ──

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFs(getFirebaseApp());
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// ── Firestore Schema Types ──

export type FirebaseUserRole = "partner" | "customer" | "expert" | "admin";

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: FirebaseUserRole;
  company?: string;
  specialization?: string;
  photoURL?: string;
  emailVerified: boolean;
  status: "active" | "pending" | "suspended";
  createdAt: unknown; // serverTimestamp
  updatedAt: unknown;
}

export interface ActivityLog {
  uid: string;
  action: string;
  details?: string;
  ip?: string;
  timestamp: unknown;
}

// ── Auth Functions ──

export async function firebaseRegister(
  email: string,
  password: string,
  displayName: string,
  phone: string,
  role: FirebaseUserRole,
  extra?: { company?: string; specialization?: string }
): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Set display name on Firebase Auth
    await updateProfile(user, { displayName });

    // Send email verification
    await sendEmailVerification(user);

    // Create Firestore user profile
    const db = getFirestoreDb();
    const profile: FirebaseUserProfile = {
      uid: user.uid,
      email,
      displayName,
      phone,
      role,
      company: extra?.company,
      specialization: extra?.specialization,
      photoURL: "",
      emailVerified: false,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", user.uid), profile);

    // Log activity
    await logActivity(user.uid, "account_created", `Registered as ${role}`);

    return { success: true, uid: user.uid };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return { success: false, error: msg };
  }
}

export async function firebaseLogin(
  email: string,
  password: string
): Promise<{ success: boolean; uid?: string; role?: FirebaseUserRole; error?: string }> {
  try {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Fetch profile to get role
    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.data() as FirebaseUserProfile | undefined;

    // Log activity
    await logActivity(user.uid, "login", "Email/password login");

    return {
      success: true,
      uid: user.uid,
      role: profile?.role || "partner",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Login failed";
    return { success: false, error: msg };
  }
}

export async function firebaseLogout(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}

export async function firebaseResetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send reset email";
    return { success: false, error: msg };
  }
}

// ── Profile Functions ──

export async function getUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as FirebaseUserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<FirebaseUserProfile, "displayName" | "phone" | "company" | "specialization" | "photoURL">>
): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  // Update Firebase Auth display name if changed
  if (data.displayName) {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    }
  }

  await logActivity(uid, "profile_updated", "Profile details updated");
}

// ── Activity Logging ──

export async function logActivity(uid: string, action: string, details?: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    await addDoc(collection(db, "activityLogs"), {
      uid,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Silently fail — activity logging should not block user operations
  }
}

export async function getActivityLogs(uid: string, max = 20): Promise<ActivityLog[]> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, "activityLogs"),
    where("uid", "==", uid),
    orderBy("timestamp", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ActivityLog);
}

// ── Auth State Helper ──

export function onFirebaseAuthChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export { type User as FirebaseUser } from "firebase/auth";
