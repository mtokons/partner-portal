import { getAdminApp } from "../src/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getCandidates, deleteCandidate, deleteCandidateServices, deleteListItemsByField, hardDeleteUserAccount } from "../src/lib/sharepoint";

async function main() {
  console.log("🚀 Starting Production Data Reset...");
  const db = getFirestore(getAdminApp());
  const auth = getAuth(getAdminApp());
  
  // 1. Fetch all Firestore Users
  const snapshot = await db.collection("users").get();
  const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const usersToDelete = users.filter(u => {
    if (u.email === "info@dafb.org") return false;
    if (u.email === "admin@sccg.de") return false;

    // Delete QA Accounts
    if (u.email && u.email.toLowerCase().startsWith("qa.")) return true;
    
    // Delete test partner accounts and specific test accounts
    if (u.email && u.email.toLowerCase().startsWith("test.")) return true;
    
    // Delete flagged test data
    if (u.isTestData === true) return true;

    return false;
  });

  console.log(`\nFound ${usersToDelete.length} Firebase users to delete.`);

  // Execute Firebase Deletions
  for (const u of usersToDelete) {
    console.log(`Deleting user: ${u.email} (${u.id})`);
    
    // 1a. Delete from Firestore
    await db.collection("users").doc(u.id).delete().catch(e => console.error("Firestore delete error:", e.message));
    
    // 1b. Delete from Firebase Auth
    if (u.firebaseUid || u.id) {
        await auth.deleteUser(u.firebaseUid || u.id).catch(e => {
            if (e.code !== 'auth/user-not-found') console.error("Auth delete error:", e.message);
        });
    }

    // 1c. Delete from SharePoint UserProfiles / UserRoles (to be thorough)
    if (u.email) {
        await hardDeleteUserAccount(u.email).catch(e => console.error("SP User delete error:", e.message));
    }
  }

  // 2. Fetch and delete SP Candidates
  const candidates = await getCandidates().catch(() => []);
  const candidatesToDelete = candidates.filter(c => {
    // KEEP DAFB candidates
    if (c.email === "HASAN.MH.MYM@GMAIL.COM") return false;
    if (c.partnerName === "DAFB") return false;

    // Otherwise, we delete because they are test registration service clients
    return true;
  });

  console.log(`\nFound ${candidatesToDelete.length} SharePoint Candidates to delete.`);

  for (const c of candidatesToDelete) {
    console.log(`Deleting candidate: ${c.email} (ID: ${c.id})`);
    // Delete associated services first
    await deleteCandidateServices(c.id).catch(e => console.error("Candidate services delete error:", e.message));
    // Delete candidate
    await deleteCandidate(c.id).catch(e => console.error("Candidate delete error:", e.message));
  }

  console.log("\n✅ Production data reset complete.");
}

main().catch(console.error);
