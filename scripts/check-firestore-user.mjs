import { readFileSync } from "fs";
import * as admin from "firebase-admin";

// Load local environment
try {
  const env = readFileSync(".env.local", "utf-8");
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

if (!admin.default.apps.length) {
  admin.default.initializeApp({
    credential: admin.default.credential.cert(serviceAccount),
  });
}

const db = admin.default.firestore();
const emailToFind = "mhasnainn@gmail.com";

console.log(`Searching for user: ${emailToFind} in Firestore...`);
const snap = await db.collection("users").where("email", "==", emailToFind).get();

if (snap.empty) {
  console.log(`No user found with email ${emailToFind} in Firestore.`);
  
  // Show a count of users and a sample of first 3 users in Firestore
  const allSnap = await db.collection("users").limit(10).get();
  console.log(`Total users in Firestore (capped at 10): ${allSnap.size}`);
  allSnap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Email: ${doc.data().email}, Role: ${doc.data().role}, Status: ${doc.data().status}`);
  });
} else {
  snap.forEach((doc) => {
    console.log(`Found Firestore Document: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

process.exit(0);
