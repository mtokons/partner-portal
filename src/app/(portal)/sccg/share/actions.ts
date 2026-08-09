"use server";

import { requirePermission } from "@/lib/permissions";
import { Repository } from "@/lib/repository";
import { listCandidateDocuments, type CandidateDocument } from "@/lib/candidate-documents";
import { sendEmailViaGraph } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";

export interface ShareWizardCandidate {
  id: string;
  fullName: string;
  sccgId: string;
  email: string;
  workflowCategory: string;
}

export interface ShareWizardPartner {
  id: string;
  name: string;
  email: string;
  company: string;
}

export async function fetchShareWizardDataAction(): Promise<{
  success: boolean;
  data?: { candidates: ShareWizardCandidate[]; partners: ShareWizardPartner[] };
  error?: string;
}> {
  try {
    await requirePermission("candidate.share");
    const [candidates, partners] = await Promise.all([
      Repository.candidates.getAll(),
      Repository.partners.getAll(),
    ]);
    return {
      success: true,
      data: {
        candidates: candidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          sccgId: c.sccgId,
          email: c.email,
          workflowCategory: c.workflowCategory,
        })),
        partners: partners
          .filter((p) => p.status !== "suspended")
          .map((p) => ({ id: p.id, name: p.name, email: p.email, company: p.company })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load sharing data" };
  }
}

export async function fetchCandidateDocumentsForShareAction(
  candidateId: string,
  candidateName: string
): Promise<{ success: boolean; data?: CandidateDocument[]; error?: string }> {
  try {
    await requirePermission("candidate.share");
    const documents = await listCandidateDocuments(candidateId, candidateName);
    return { success: true, data: documents };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load documents" };
  }
}

/** Fetches a document's bytes via its Graph download URL and base64-encodes them for email attachment. */
async function toEmailAttachment(doc: CandidateDocument) {
  const res = await fetch(doc.downloadUrl);
  if (!res.ok) throw new Error(`Failed to download "${doc.name}" for attachment`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    name: doc.name,
    contentType: res.headers.get("content-type") || "application/octet-stream",
    contentBase64: buffer.toString("base64"),
  };
}

export async function sendCandidateShareEmailAction(input: {
  candidateId: string;
  partnerId: string;
  documentIds: string[];
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("candidate.share");

    const candidate = await Repository.candidates.getById(input.candidateId);
    if (!candidate) return { success: false, error: "Candidate not found" };

    const partner = await Repository.partners.getById(input.partnerId);
    if (!partner) return { success: false, error: "Partner not found" };

    if (!input.subject.trim() || !input.message.trim()) {
      return { success: false, error: "Subject and message are required" };
    }

    const documents = await listCandidateDocuments(candidate.id, candidate.fullName);
    const selectedDocs = documents.filter((d) => input.documentIds.includes(d.id));

    const attachments = await Promise.all(selectedDocs.map(toEmailAttachment));

    await sendEmailViaGraph({
      to: partner.email,
      toName: partner.name,
      subject: input.subject,
      htmlBody: input.message.replace(/\n/g, "<br/>"),
      attachments,
    });

    await writeAuditLog({
      action: "candidate.share",
      actorId: user.id,
      actorEmail: user.email,
      targetId: candidate.id,
      targetType: "candidate",
      metadata: {
        partnerId: partner.id,
        partnerEmail: partner.email,
        documentNames: selectedDocs.map((d) => d.name),
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send candidate profile" };
  }
}
