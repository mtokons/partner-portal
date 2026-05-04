// Scheduled Firestore → SharePoint user sync job
// This script fetches all Firestore users and upserts them into the SharePoint UserProfiles list.
// To be run as a scheduled job (e.g., via cron or serverless scheduler)

import { getAdminFirestore } from "../src/lib/firebase-admin";
import { createUserProfile } from "../src/lib/sharepoint";
import type { UserProfile } from "../src/types";

async function syncFirestoreUsersToSharePoint() {
  const db = getAdminFirestore();
  const usersSnap = await db.collection("users").get();
  const users: UserProfile[] = usersSnap.docs.map((d) => ({
    id: d.id,
    firebaseUid: d.data().firebaseUid || d.id,
    email: d.data().email,
    displayName: d.data().displayName || d.data().name || d.data().email,
    phone: d.data().phone,
    role: d.data().role,
    company: d.data().company,
    specialization: d.data().specialization,
    status: d.data().status || "active",
    createdAt: d.data().createdAt || new Date().toISOString(),
    updatedAt: d.data().updatedAt || new Date().toISOString(),
  }));

  for (const user of users) {
    try {
      await createUserProfile({ ...user });
      console.log(`Upserted user: ${user.email}`);
    } catch (e) {
      console.error(`Failed to upsert user ${user.email}:`, e);
    }
  }
}

if (require.main === module) {
  syncFirestoreUsersToSharePoint().then(() => {
    console.log("User sync complete.");
    process.exit(0);
  });
}
