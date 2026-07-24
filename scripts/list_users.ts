import { getAdminApp } from "../src/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getCandidates, getPartners, deleteCandidate } from "../src/lib/sharepoint";

async function main() {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection("users").get();
  const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log("DAFB users:", users.filter(u => u.email && u.email.toLowerCase().includes("dafb")).map(u => u.email));

  const candidates = await getCandidates().catch(() => []);
  console.log("SP Candidates:");
  candidates.forEach(c => {
    console.log(`- ${c.id}: ${c.email} (Partner: ${c.partnerName} / ${c.registeredByPartnerName})`);
  });
  
  const partners = await getPartners().catch(() => []);
  console.log("\nSP Partners:");
  partners.forEach(p => {
    console.log(`- ${p.id}: ${p.name} (${p.email})`);
  });
}

main().catch(console.error);
