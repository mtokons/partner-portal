import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load env from .env.production
try {
  const env = readFileSync(".env.production", "utf-8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  });
} catch {}

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, ''),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, ''),
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, "\n"),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection("users").where("email", "==", "moh.arifin@mysccg.de").get();
  if (snap.empty) {
    console.log("No user found with email moh.arifin@mysccg.de");
  } else {
    snap.forEach((doc) => {
      console.log("User doc ID:", doc.id);
      console.log("User doc data:", JSON.stringify(doc.data(), null, 2));
    });
  }
}

run().catch(console.error);
