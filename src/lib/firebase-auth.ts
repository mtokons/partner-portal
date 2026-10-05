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
  signInWithPopup,
  GoogleAuthProvider,
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

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, "").trim();
}

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
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
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.trim() !== "" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.trim() !== ""
  );
}

// ── Auth Error Parser ──

export interface AuthErrorInfo {
  message: string;
  code: string;
  category: "server" | "api" | "password" | "user" | "duplicate_email" | "security" | "validation" | "generic";
}

export function getSpecificAuthErrorMessage(
  err: unknown,
  context: "login" | "register" | "reset" = "login"
): AuthErrorInfo {
  const code = (typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "string")
    ? (err as { code: string }).code
    : "";
  const rawMsg = err instanceof Error ? err.message : String(err || "");
  const normalized = (code + " " + rawMsg).toLowerCase();

  // 1. API Issues (Configuration / Invalid Key / Quotas / Domain)
  if (
    code === "auth/api-key-not-valid" ||
    code === "auth/invalid-api-key" ||
    code === "auth/app-not-authorized" ||
    code === "auth/unauthorized-domain" ||
    code === "auth/quota-exceeded" ||
    code === "auth/project-not-found" ||
    code === "auth/configuration-not-found" ||
    normalized.includes("api-key-not-valid") ||
    normalized.includes("invalid-api-key") ||
    normalized.includes("pass-a-valid-api-key") ||
    normalized.includes("api key")
  ) {
    return {
      category: "api",
      code: code || "auth/api-key-not-valid",
      message: "API Error: Firebase authentication service is misconfigured or API key is invalid. Please contact portal administrator.",
    };
  }

  // 2. Server Issues (Network / Timeout / Internal error)
  if (
    code === "auth/network-request-failed" ||
    code === "auth/internal-error" ||
    code === "auth/timeout" ||
    normalized.includes("network-request-failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("econnrefused") ||
    normalized.includes("timeout") ||
    normalized.includes("server error")
  ) {
    return {
      category: "server",
      code: code || "auth/network-request-failed",
      message: "Server Error: Unable to reach authentication server. Please check your internet connection and try again.",
    };
  }

  // 3. Duplicate Email (Registration)
  if (
    code === "auth/email-already-in-use" ||
    code === "auth/credential-already-in-use" ||
    normalized.includes("email-already-in-use") ||
    normalized.includes("already in use")
  ) {
    return {
      category: "duplicate_email",
      code: code || "auth/email-already-in-use",
      message: "Duplicate Email Error: An account with this email address already exists. Please sign in instead.",
    };
  }

  // 4. Password Issues
  if (
    code === "auth/wrong-password" ||
    code === "auth/invalid-password" ||
    normalized.includes("wrong-password")
  ) {
    return {
      category: "password",
      code: code || "auth/wrong-password",
      message: "Password Error: The password you entered is incorrect. Please double check and try again.",
    };
  }

  if (
    code === "auth/weak-password" ||
    normalized.includes("weak-password") ||
    normalized.includes("password should be at least")
  ) {
    return {
      category: "password",
      code: code || "auth/weak-password",
      message: "Password Error: Password is too weak. Please use at least 6 characters.",
    };
  }

  // 5. User Issues
  if (
    code === "auth/user-not-found" ||
    normalized.includes("user-not-found")
  ) {
    return {
      category: "user",
      code: code || "auth/user-not-found",
      message: "User Error: No registered account found with this email address. Please check your email or create an account.",
    };
  }

  if (
    code === "auth/user-disabled" ||
    normalized.includes("user-disabled")
  ) {
    return {
      category: "user",
      code: code || "auth/user-disabled",
      message: "User Error: This account has been disabled or suspended. Please contact the portal administrator.",
    };
  }

  // 6. Security / Rate Limiting
  if (
    code === "auth/too-many-requests" ||
    normalized.includes("too-many-requests")
  ) {
    return {
      category: "security",
      code: code || "auth/too-many-requests",
      message: "Security Error: Too many failed login attempts. Access is temporarily locked. Please wait a few minutes or reset your password.",
    };
  }

  // 7. Invalid Email Format
  if (
    code === "auth/invalid-email" ||
    normalized.includes("invalid-email")
  ) {
    return {
      category: "validation",
      code: code || "auth/invalid-email",
      message: "Validation Error: Invalid email address format. Please enter a valid email address.",
    };
  }

  // 8. Firebase v10 Combined Invalid Credential (User enumeration protection)
  if (
    code === "auth/invalid-credential" ||
    normalized.includes("invalid-credential")
  ) {
    return {
      category: "user",
      code: code || "auth/invalid-credential",
      message: context === "login"
        ? "User Error: Incorrect password or user account not found. Please verify your credentials or register."
        : "Validation Error: Invalid registration credentials.",
    };
  }

  // 9. Popup/Google Sign-In cancellation
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    normalized.includes("popup-closed-by-user")
  ) {
    return {
      category: "generic",
      code: code || "auth/popup-closed-by-user",
      message: "Google Sign-In Cancelled: The authentication window was closed before completion.",
    };
  }

  if (
    code === "auth/popup-blocked" ||
    normalized.includes("popup-blocked")
  ) {
    return {
      category: "generic",
      code: code || "auth/popup-blocked",
      message: "Browser Error: Sign-in popup was blocked. Please allow popups for this site.",
    };
  }

  // Fallback
  return {
    category: "generic",
    code: code || "auth/unknown",
    message: rawMsg ? `Authentication Error: ${rawMsg}` : "An unexpected authentication error occurred. Please try again.",
  };
}

// ── Firestore Schema Types ──

export type FirebaseUserRole = "partner" | "customer" | "expert" | "admin" | "sccg-admin" | "sccg-staff";

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
  /** Admin-assigned landing dashboard path that overrides role-based routing. */
  dashboardOverride?: string;
  createdAt: unknown; // serverTimestamp
  updatedAt: unknown;
}

function normalizeFirebaseRole(role: string | undefined): FirebaseUserRole {
  return (role || "partner").trim().toLowerCase() as FirebaseUserRole;
}

export interface ActivityLog {
  uid: string;
  action: string;
  details?: string;
  ip?: string;
  timestamp: unknown;
}

// ── Auth Functions ──

async function registerViaServerFallback(
  email: string,
  password: string,
  displayName: string,
  phone: string,
  role: FirebaseUserRole,
  extra?: { company?: string; specialization?: string }
): Promise<{ success: boolean; uid?: string; error?: string; errorCode?: string; errorCategory?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: displayName,
        phone,
        role,
        company: extra?.company,
        specialization: extra?.specialization,
      }),
    });
    const data = await res.json();
    return {
      success: !!data.success,
      uid: data.uid,
      error: data.error,
      errorCode: data.errorCode || (data.success ? undefined : "server_registration"),
      errorCategory: data.errorCategory || (data.success ? undefined : "server"),
    };
  } catch (netErr: any) {
    return {
      success: false,
      error: "Server Error: Unable to complete registration. Please check your internet connection.",
      errorCode: "auth/network-request-failed",
      errorCategory: "server",
    };
  }
}

export async function firebaseRegister(
  email: string,
  password: string,
  displayName: string,
  phone: string,
  role: FirebaseUserRole,
  extra?: { company?: string; specialization?: string }
): Promise<{ success: boolean; uid?: string; error?: string; errorCode?: string; errorCategory?: string }> {
  if (!isFirebaseConfigured()) {
    // Seamless fallback to server-side registration
    return await registerViaServerFallback(email, password, displayName, phone, role, extra);
  }
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Set display name on Firebase Auth
    await updateProfile(user, { displayName });

    // Send email verification
    try {
      await sendEmailVerification(user);
    } catch {
      // Non-fatal if verification email fails
    }

    // Create Firestore user profile
    const db = getFirestoreDb();
    const profile: FirebaseUserProfile = {
      uid: user.uid,
      email,
      displayName,
      phone,
      role,
      company: extra?.company || "",
      specialization: extra?.specialization || "",
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
    const errorInfo = getSpecificAuthErrorMessage(err, "register");
    // If the client failed with an API key, misconfiguration or internal error, attempt the server-side registration fallback!
    if (
      errorInfo.category === "api" ||
      errorInfo.code.includes("api-key") ||
      errorInfo.code === "auth/internal-error"
    ) {
      console.warn("[firebaseRegister] Client registration encountered API error, falling back to server API...", errorInfo.message);
      const serverFallbackResult = await registerViaServerFallback(email, password, displayName, phone, role, extra);
      if (serverFallbackResult.success) {
        return serverFallbackResult;
      }
      return serverFallbackResult.error ? serverFallbackResult : {
        success: false,
        error: errorInfo.message,
        errorCode: errorInfo.code,
        errorCategory: errorInfo.category,
      };
    }

    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorCategory: errorInfo.category,
    };
  }
}

export async function firebaseLogin(
  email: string,
  password: string
): Promise<{ success: boolean; uid?: string; role?: FirebaseUserRole; error?: string; errorCode?: string; errorCategory?: string }> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: "API error: Firebase authentication is not configured.",
      errorCode: "auth/not-configured",
      errorCategory: "api",
    };
  }
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
      role: normalizeFirebaseRole(profile?.role),
    };
  } catch (err: unknown) {
    const errorInfo = getSpecificAuthErrorMessage(err, "login");
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorCategory: errorInfo.category,
    };
  }
}

export async function firebaseGoogleLogin(): Promise<{ success: boolean; uid?: string; role?: FirebaseUserRole; error?: string; errorCode?: string; errorCategory?: string }> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: "API error: Firebase authentication is not configured.",
      errorCode: "auth/not-configured",
      errorCategory: "api",
    };
  }
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "users", user.uid));
    
    if (!snap.exists()) {
      // If user doesn't exist in our DB, block them and log them out of Firebase Auth.
      await auth.signOut();
      return {
        success: false,
        error: "User error: No registered profile found for this Google account. Please create an account first.",
        errorCode: "auth/user-not-found",
        errorCategory: "user",
      };
    }

    const profile = snap.data() as FirebaseUserProfile;
    await logActivity(user.uid, "login_google", "Google social login");

    return {
      success: true,
      uid: user.uid,
      role: normalizeFirebaseRole(profile.role),
    };
  } catch (err: unknown) {
    const errorInfo = getSpecificAuthErrorMessage(err, "login");
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorCategory: errorInfo.category,
    };
  }
}

export async function firebaseGoogleSignup(
  role: FirebaseUserRole,
  company: string = "",
  specialization: string = ""
): Promise<{ success: boolean; uid?: string; role?: FirebaseUserRole; error?: string; errorCode?: string; errorCategory?: string }> {
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "users", user.uid));
    
    if (!snap.exists()) {
      const profile: FirebaseUserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Google User",
        phone: user.phoneNumber || "",
        role: role,
        photoURL: user.photoURL || "",
        company: company,
        specialization: specialization,
        emailVerified: true,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", user.uid), profile);
      await logActivity(user.uid, "account_created", `Registered as ${role} via Google`);
    } else {
      // Account already exists, just log them in
      await logActivity(user.uid, "login_google", "Google social login (subsequent)");
    }

    return {
      success: true,
      uid: user.uid,
      role: snap.exists() ? (snap.data() as FirebaseUserProfile).role : role,
    };
  } catch (err: unknown) {
    const errorInfo = getSpecificAuthErrorMessage(err, "register");
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorCategory: errorInfo.category,
    };
  }
}

export async function firebaseLogout(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const auth = getFirebaseAuth();
    await fbSignOut(auth);
  } catch {
    // Ignore if client firebase not initialized
  }
}

export async function firebaseResetPassword(
  email: string
): Promise<{ success: boolean; error?: string; errorCode?: string; errorCategory?: string }> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: unknown) {
    const errorInfo = getSpecificAuthErrorMessage(err, "reset");
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorCategory: errorInfo.category,
    };
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
