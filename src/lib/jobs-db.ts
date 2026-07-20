import { getAdminFirestore } from "./firebase-admin";
import type { JobPost, CandidateCvVariation, CoverLetter, KanbanApplication, InterviewSlot } from "@/types";

function db() {
  return getAdminFirestore();
}

function now() {
  return new Date().toISOString();
}

function toPlainObject<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// Job & Apprenticeship Postings
// ============================================================

export async function getJobPosts(filters?: { type?: string; status?: string }): Promise<JobPost[]> {
  let q: FirebaseFirestore.Query = db().collection("jobPosts").orderBy("createdAt", "desc");
  if (filters?.type) q = q.where("type", "==", filters.type);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<JobPost>({ id: d.id, ...d.data() }));
}

export async function getJobPostById(id: string): Promise<JobPost | null> {
  const snap = await db().collection("jobPosts").doc(id).get();
  return snap.exists ? toPlainObject<JobPost>({ id: snap.id, ...snap.data() }) : null;
}

export async function createJobPost(data: Omit<JobPost, "id" | "createdAt" | "updatedAt">): Promise<JobPost> {
  const doc = {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await db().collection("jobPosts").add(doc);
  return { id: ref.id, ...doc } as unknown as JobPost;
}

export async function updateJobPost(id: string, data: Partial<JobPost>): Promise<void> {
  await db().collection("jobPosts").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteJobPost(id: string): Promise<void> {
  await db().collection("jobPosts").doc(id).delete();
}

// ============================================================
// Candidate CV Variations (up to 10 variations)
// ============================================================

export async function getCvVariations(seekerId: string): Promise<CandidateCvVariation[]> {
  const snap = await db().collection("users").doc(seekerId).collection("cvVariations").get();
  return snap.docs.map((d) => toPlainObject<CandidateCvVariation>({ id: d.id, ...d.data() }));
}

export async function saveCvVariation(seekerId: string, variation: Omit<CandidateCvVariation, "id"> & { id?: string }): Promise<string> {
  const userRef = db().collection("users").doc(seekerId);
  const variationsColl = userRef.collection("cvVariations");
  
  if (!variation.id) {
    const snap = await variationsColl.get();
    if (snap.size >= 10) {
      throw new Error("Maximum of 10 CV variations reached.");
    }
  }

  const id = variation.id || db().collection("cvVariations").doc().id;
  const doc = {
    ...variation,
    id,
  };
  
  await variationsColl.doc(id).set(doc);
  await userRef.update({ updatedAt: now() });
  return id;
}

export async function deleteCvVariation(seekerId: string, variationId: string): Promise<void> {
  await db().collection("users").doc(seekerId).collection("cvVariations").doc(variationId).delete();
}

// ============================================================
// Cover Letters (DIN 5008 styled templates)
// ============================================================

export async function getCoverLetters(seekerId: string): Promise<CoverLetter[]> {
  const snap = await db().collection("users").doc(seekerId).collection("coverLetters").get();
  return snap.docs.map((d) => toPlainObject<CoverLetter>({ id: d.id, ...d.data() }));
}

export async function saveCoverLetter(seekerId: string, letter: Omit<CoverLetter, "id"> & { id?: string }): Promise<string> {
  const id = letter.id || db().collection("users").doc(seekerId).collection("coverLetters").doc().id;
  const doc = { ...letter, id };
  await db().collection("users").doc(seekerId).collection("coverLetters").doc(id).set(doc);
  return id;
}

export async function deleteCoverLetter(seekerId: string, letterId: string): Promise<void> {
  await db().collection("users").doc(seekerId).collection("coverLetters").doc(letterId).delete();
}

// ============================================================
// Kanban Tracker Application Cards
// ============================================================

export async function getKanbanApplications(seekerId?: string, partnerId?: string): Promise<KanbanApplication[]> {
  let q: FirebaseFirestore.Query = db().collection("kanbanApplications");
  if (seekerId) q = q.where("seekerId", "==", seekerId);
  if (partnerId) q = q.where("partnerId", "==", partnerId);
  
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<KanbanApplication>({ id: d.id, ...d.data() }));
}

export async function createKanbanApplication(data: Omit<KanbanApplication, "id" | "updatedAt">): Promise<KanbanApplication> {
  const doc = {
    ...data,
    updatedAt: now(),
  };
  const ref = await db().collection("kanbanApplications").add(doc);
  return { id: ref.id, ...doc } as unknown as KanbanApplication;
}

export async function updateKanbanApplicationStage(id: string, stage: KanbanApplication["stage"]): Promise<void> {
  await db().collection("kanbanApplications").doc(id).update({ stage, updatedAt: now() });
}

export async function addKanbanApplicationNote(id: string, note: string): Promise<void> {
  const ref = db().collection("kanbanApplications").doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    const currentNotes = (snap.data()?.notes || []) as string[];
    await ref.update({
      notes: [...currentNotes, note],
      updatedAt: now()
    });
  }
}

// ============================================================
// Interview Scheduler / Calendar Booking
// ============================================================

export async function getInterviewSlots(filters?: { partnerId?: string; seekerId?: string; status?: string }): Promise<InterviewSlot[]> {
  let q: FirebaseFirestore.Query = db().collection("interviewSlots").orderBy("startTime", "asc");
  if (filters?.partnerId) q = q.where("partnerId", "==", filters.partnerId);
  if (filters?.seekerId) q = q.where("seekerId", "==", filters.seekerId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<InterviewSlot>({ id: d.id, ...d.data() }));
}

export async function createInterviewSlot(data: Omit<InterviewSlot, "id">): Promise<InterviewSlot> {
  const doc = { ...data };
  const ref = await db().collection("interviewSlots").add(doc);
  return { id: ref.id, ...doc };
}

export async function bookInterviewSlot(slotId: string, seekerId: string, seekerName: string, notes?: string): Promise<void> {
  await db().collection("interviewSlots").doc(slotId).update({
    seekerId,
    seekerName,
    status: "booked",
    notes: notes || "",
  });
}

export async function cancelInterviewSlot(slotId: string): Promise<void> {
  await db().collection("interviewSlots").doc(slotId).update({
    seekerId: null,
    seekerName: null,
    status: "available",
    notes: null,
  });
}

export async function deleteInterviewSlot(slotId: string): Promise<void> {
  await db().collection("interviewSlots").doc(slotId).delete();
}
