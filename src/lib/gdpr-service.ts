import { getAdminFirestore, getAdminApp } from "./firebase-admin";
import type { CandidateCvVariation } from "@/types";

function db() {
  return getAdminFirestore();
}

/**
 * Anonymizes CV profile details by masking identifying fields.
 */
export function getAnonymizedCv(cv: CandidateCvVariation): CandidateCvVariation {
  return {
    ...cv,
    name: "Candidate Anonymized (DSGVO)",
    photoUrl: undefined,
    experience: cv.experience.map(exp => ({
      ...exp,
      description: exp.description.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email masked]")
                                   .replace(/\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, "[phone masked]")
    }))
  };
}

/**
 * Article 17 GDPR - Right to be Forgotten.
 * Performs a hard delete of user profile and all nested variations, applications, and slots.
 */
export async function purgeUserAccount(uid: string): Promise<void> {
  const firestore = db();
  const userRef = firestore.collection("users").doc(uid);
  
  // 1. Delete CV variations subcollection
  const cvsSnap = await userRef.collection("cvVariations").get();
  const cvBatch = firestore.batch();
  cvsSnap.docs.forEach(doc => cvBatch.delete(doc.ref));
  await cvBatch.commit();
  
  // 2. Delete Cover letters subcollection
  const lettersSnap = await userRef.collection("coverLetters").get();
  const letterBatch = firestore.batch();
  lettersSnap.docs.forEach(doc => letterBatch.delete(doc.ref));
  await letterBatch.commit();

  // 3. Delete Kanban applications where seekerId matches
  const kanbanSnap = await firestore.collection("kanbanApplications").where("seekerId", "==", uid).get();
  const kanbanBatch = firestore.batch();
  kanbanSnap.docs.forEach(doc => kanbanBatch.delete(doc.ref));
  await kanbanBatch.commit();

  // 4. Release or delete interview slots booked by this candidate
  const interviewSnap = await firestore.collection("interviewSlots").where("seekerId", "==", uid).get();
  const interviewBatch = firestore.batch();
  interviewSnap.docs.forEach(doc => {
    interviewBatch.update(doc.ref, {
      seekerId: null,
      seekerName: null,
      status: "available",
      notes: null
    });
  });
  await interviewBatch.commit();

  // 5. Delete from Firebase Auth (if available)
  const app = getAdminApp();
  if (app) {
    const admin = await import("firebase-admin");
    try {
      await admin.auth(app).deleteUser(uid);
    } catch (err) {
      console.warn(`Auth user ${uid} might already be deleted or not found:`, err);
    }
  }

  // 6. Delete main user document
  await userRef.delete();
}

/**
 * Scan for and automatically purge candidate accounts with no activity for more than 180 days.
 */
export async function retentionScanAndPurge(): Promise<{ scanned: number; purged: number }> {
  const firestore = db();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 180);
  const thresholdIso = thresholdDate.toISOString();

  // Find all candidate users with lastActive or updatedAt before threshold
  const candidatesSnap = await firestore.collection("users")
    .where("role", "in", ["customer", "student", "job-seeker", "ausbildung-seeker"])
    .get();

  let purgedCount = 0;
  for (const doc of candidatesSnap.docs) {
    const data = doc.data();
    const lastActive = data.lastActive || data.updatedAt || data.createdAt || "";
    
    if (lastActive && lastActive < thresholdIso) {
      await purgeUserAccount(doc.id);
      purgedCount++;
    }
  }

  return { scanned: candidatesSnap.size, purged: purgedCount };
}
