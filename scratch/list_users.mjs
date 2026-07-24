import { getAdminApp } from "../src/lib/firebase-admin.js";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(getAdminApp());
const snapshot = await db.collection("users").get();
const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

console.log("Total users:", users.length);
console.log("Test users (isTestData=true):", users.filter(u => u.isTestData).length);
console.log("DAFB users:", users.filter(u => u.email && u.email.toLowerCase().includes("dafb")).map(u => u.email));
console.log("QA users:", users.filter(u => u.email && u.email.toLowerCase().startsWith("qa.")).map(u => u.email));
console.log("Partner users:", users.filter(u => u.role === "partner").map(u => ({ email: u.email, orgName: u.orgName })));

