import { getCandidates, createCandidate } from "@/lib/sharepoint";
import type { Candidate } from "@/types";

/**
 * Ensures a user with role "customer" has a corresponding record in SharePoint's Candidates list.
 * Rule: Always if the user role is customer, put the user in the candidate list.
 */
export async function ensureCustomerCandidateRecord(data: {
  email: string;
  fullName?: string;
  phone?: string;
  partnerId?: string;
  partnerName?: string;
  workflowCategory?: string;
}): Promise<Candidate | null> {
  const emailNorm = (data.email || "").toLowerCase().trim();
  if (!emailNorm) return null;

  try {
    const allCandidates = await getCandidates();
    const existing = allCandidates.find(
      (c) => (c.email || "").toLowerCase().trim() === emailNorm
    );
    if (existing) {
      return existing;
    }

    // Determine next sequential SccgId
    let maxSeq = 0;
    for (const c of allCandidates) {
      const sid = String(c.sccgId || "");
      const m = sid.match(/-(\d{4})$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
    const sccgId = `SCCG-TRN-${String(maxSeq + 1).padStart(4, "0")}`;

    const fullName =
      (data.fullName || "").trim() ||
      emailNorm.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const created = await createCandidate({
      sccgId,
      fullName,
      email: emailNorm,
      phone: (data.phone || "").trim(),
      partnerId: data.partnerId || "SCCG-DIRECT",
      partnerName: data.partnerName || (data.partnerId ? "Partner" : "SCCG Direct"),
      workflowCategory: (data.workflowCategory as any) || "Training & Language",
      currentStatus: "REGISTERED",
      nationality: "Unknown",
      country: "Germany",
      totalServiceFee: 0,
      sccgShare: 0,
      partnerShare: 0,
      depositAmount: 0,
      marginPercentage: 15,
      paymentStatus: "pending",
      isOnHold: false,
      createdBy: "portal-registration",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });

    console.log(`[customer-candidate-sync] Created Candidate record for customer ${emailNorm} -> ${sccgId}`);
    return created;
  } catch (err) {
    console.error(`[customer-candidate-sync] Error ensuring candidate record for ${emailNorm}:`, err);
    return null;
  }
}

/**
 * Syncs any customers in Firestore or Managed Users who are missing from SharePoint Candidates list.
 * Safe to call from candidate list loaders.
 */
export async function syncMissingCustomerCandidates(
  existingCandidates?: Candidate[]
): Promise<Candidate[]> {
  try {
    const candidates = existingCandidates ?? (await getCandidates());
    const existingEmails = new Set(
      candidates.map((c) => (c.email || "").toLowerCase().trim()).filter(Boolean)
    );

    // 1. Fetch Firestore users with role === "customer"
    const missingUsers: Array<{
      email: string;
      displayName?: string;
      phone?: string;
      partnerId?: string;
      partnerName?: string;
    }> = [];

    try {
      const { getAdminFirestore } = await import("@/lib/firebase-admin");
      const db = getAdminFirestore();
      const snap = await db.collection("users").where("role", "==", "customer").get();
      snap.forEach((doc) => {
        const d = doc.data();
        const em = String(d.email || "").toLowerCase().trim();
        if (em && !existingEmails.has(em)) {
          existingEmails.add(em);
          missingUsers.push({
            email: em,
            displayName: String(d.displayName || d.fullName || d.name || ""),
            phone: String(d.phone || ""),
            partnerId: String(d.registeredByPartnerId || d.partnerId || ""),
            partnerName: String(d.registeredByPartnerName || d.partnerName || ""),
          });
        }
      });
    } catch {
      // Fallback via REST API if Admin SDK is unavailable
      const projectIds = [
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        process.env.FIREBASE_PROJECT_ID,
        "sccg-partner-portal",
      ].filter(Boolean) as string[];

      for (const projectId of projectIds) {
        try {
          const res = await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`,
            { cache: "no-store" }
          );
          if (!res.ok) continue;
          const json = await res.json();
          if (!json.documents || !Array.isArray(json.documents)) continue;

          json.documents.forEach((docSnap: any) => {
            const fields = docSnap.fields || {};
            const role = (fields.role?.stringValue || "").toLowerCase().trim();
            if (role === "customer") {
              const em = (fields.email?.stringValue || "").toLowerCase().trim();
              if (em && !existingEmails.has(em)) {
                existingEmails.add(em);
                missingUsers.push({
                  email: em,
                  displayName: fields.displayName?.stringValue || fields.fullName?.stringValue || fields.name?.stringValue,
                  phone: fields.phone?.stringValue,
                  partnerId: fields.registeredByPartnerId?.stringValue || fields.partnerId?.stringValue,
                  partnerName: fields.registeredByPartnerName?.stringValue || fields.partnerName?.stringValue,
                });
              }
            }
          });
          if (missingUsers.length > 0) break;
        } catch {
          /* non-fatal */
        }
      }
    }

    if (missingUsers.length === 0) return [];

    const newlyCreated: Candidate[] = [];
    for (const u of missingUsers) {
      const created = await ensureCustomerCandidateRecord(u);
      if (created) newlyCreated.push(created);
    }

    return newlyCreated;
  } catch (err) {
    console.error("[customer-candidate-sync] Error in syncMissingCustomerCandidates:", err);
    return [];
  }
}
