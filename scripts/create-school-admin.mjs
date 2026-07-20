/**
 * Creates a school-manager user account and sends login credentials via email.
 * Usage: node scripts/create-school-admin.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
if (!process.env.FIREBASE_PROJECT_ID && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  dotenv.config({ path: '.env.production' });
}

// ── Config ──────────────────────────────────────────────────────────────────
const USER_NAME   = "Dr Abdul Hai";
const USER_EMAIL  = "abdul.hai@mysccg.de";
const USER_ROLE   = "school-manager";
const PORTAL_URL  = "https://portal.mysccg.de";
const O365_SENDER = process.env.O365_SENDER_USER_ID || "admin@mysccg.de";

// ── Firebase Admin ───────────────────────────────────────────────────────────
const serviceAccount = {
  projectId:   (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID  || process.env.FIREBASE_PROJECT_ID   || "").replace(/^"|"$/g, ""),
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL || "").replace(/^"|"$/g, ""),
  privateKey:  (process.env.FIREBASE_PRIVATE_KEY  || "").replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("❌ Firebase Admin credentials missing. Check .env.local for NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db   = getFirestore();
const fbAuth = getAuth();

// ── Password Generator ───────────────────────────────────────────────────────
function generateTempPassword() {
  const upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower   = "abcdefghjkmnpqrstuvwxyz";
  const digits  = "23456789";
  const special = "!@#$";
  const all     = upper + lower + digits + special;
  const bytes   = crypto.randomBytes(12);
  const parts   = [
    upper[bytes[0]   % upper.length],
    lower[bytes[1]   % lower.length],
    digits[bytes[2]  % digits.length],
    special[bytes[3] % special.length],
  ];
  for (let i = 4; i < 12; i++) parts.push(all[bytes[i] % all.length]);
  for (let i = parts.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

// ── Microsoft Graph — send email ─────────────────────────────────────────────
async function getGraphToken() {
  const tenantId     = (process.env.AZURE_AD_TENANT_ID     || "").replace(/^"|"$/g, "");
  const clientId     = (process.env.AZURE_AD_CLIENT_ID     || "").replace(/^"|"$/g, "");
  const clientSecret = (process.env.AZURE_AD_CLIENT_SECRET || "").replace(/^"|"$/g, "");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure AD credentials missing (AZURE_AD_TENANT_ID / CLIENT_ID / CLIENT_SECRET)");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token fetch failed: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function sendWelcomeEmail(tempPassword) {
  const token = await getGraphToken();

  const html = `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px">Welcome to SCCG Partner Portal</h1>
    <p style="color:#e0e7ff;margin:6px 0 0;font-size:14px">Language School Administration</p>
  </div>
  <div style="padding:28px">
    <p style="color:#374151;font-size:15px;margin:0 0 16px">Dear <strong>${USER_NAME}</strong>,</p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6">
      Your <strong>School Admin</strong> account has been created on the SCCG Partner Portal. 
      You can now log in and manage the language school — batches, enrollments, teachers, exam results, and certificates.
    </p>
    <div style="background:#f5f3ff;border-left:4px solid #6366f1;padding:20px;border-radius:8px;margin:20px 0">
      <p style="margin:0 0 8px;color:#4b5563;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Your Login Credentials</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;width:90px">Portal URL</td>
          <td style="color:#111827;font-size:13px;padding:4px 0">
            <a href="${PORTAL_URL}" style="color:#6366f1;text-decoration:none">${PORTAL_URL}</a>
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Email</td>
          <td style="color:#111827;font-size:13px;padding:4px 0">${USER_EMAIL}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Password</td>
          <td style="padding:4px 0">
            <code style="background:#ede9fe;color:#7c3aed;padding:4px 10px;border-radius:4px;font-size:15px;letter-spacing:2px">${tempPassword}</code>
          </td>
        </tr>
      </table>
    </div>
    <p style="color:#4b5563;font-size:13px;line-height:1.6">
      For security, please change your password after your first login via <strong>Profile → Change Password</strong>.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${PORTAL_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
        Log In to Portal →
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">
      If you did not request this account or have questions, please contact the SCCG technical team.
    </p>
  </div>
  <div style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="color:#9ca3af;font-size:11px;margin:0">© 2026 SCCG — Language School Management Portal</p>
  </div>
</div>`;

  const body = {
    message: {
      subject: "Your SCCG Portal Access – School Admin Account",
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: USER_EMAIL, name: USER_NAME } }],
    },
    saveToSentItems: true,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${O365_SENDER}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sendMail failed (${res.status}): ${err}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Creating school-manager account for ${USER_NAME} <${USER_EMAIL}>\n`);

  const tempPassword = generateTempPassword();
  let firebaseUid;

  // 1. Firebase Auth — create or reset
  try {
    const existing = await fbAuth.getUserByEmail(USER_EMAIL);
    firebaseUid = existing.uid;
    console.log(`ℹ️  Firebase Auth user already exists (UID: ${firebaseUid}) — resetting password…`);
    await fbAuth.updateUser(firebaseUid, {
      displayName: USER_NAME,
      disabled: false,
      password: tempPassword,
    });
    console.log(`✅ Firebase Auth password reset.`);
  } catch (err) {
    if (err?.errorInfo?.code !== "auth/user-not-found") throw err;
    console.log(`📝 Creating new Firebase Auth user…`);
    const rec = await fbAuth.createUser({
      email: USER_EMAIL,
      displayName: USER_NAME,
      password: tempPassword,
      disabled: false,
    });
    firebaseUid = rec.uid;
    console.log(`✅ Firebase Auth user created (UID: ${firebaseUid})`);
  }

  // 2. Firestore profile — upsert
  console.log(`📂 Upserting Firestore profile…`);
  await db.collection("users").doc(firebaseUid).set(
    {
      uid: firebaseUid,
      email: USER_EMAIL,
      displayName: USER_NAME,
      fullName: USER_NAME,
      phone: "",
      role: USER_ROLE,
      roles: [USER_ROLE],
      company: "SCCG Language School",
      specialization: "School Administration",
      photoURL: "",
      emailVerified: false,
      status: "active",
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  // Set createdAt only if it doesn't exist
  const docSnap = await db.collection("users").doc(firebaseUid).get();
  if (!docSnap.data()?.createdAt) {
    await db.collection("users").doc(firebaseUid).update({ createdAt: new Date().toISOString() });
  }
  console.log(`✅ Firestore profile saved.`);

  // 3. Send credentials email
  console.log(`📧 Sending welcome email to ${USER_EMAIL}…`);
  try {
    await sendWelcomeEmail(tempPassword);
    console.log(`✅ Welcome email sent from ${O365_SENDER}.`);
  } catch (err) {
    console.error(`⚠️  Email sending failed (credentials are still valid):`, err.message);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Account ready!
   Name  : ${USER_NAME}
   Email : ${USER_EMAIL}
   Role  : ${USER_ROLE} (school admin console)
   UID   : ${firebaseUid}
   Temp pw: ${tempPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
