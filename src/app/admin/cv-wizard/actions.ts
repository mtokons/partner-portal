"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getExpertById, getEvaluationsForExpert,
  createBankCv,
} from "@/lib/expert-bank";
import { uploadDriveFile } from "@/lib/graph";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

export interface ExpertWithHistory {
  expert: BankExpert;
  evaluations: BankEvaluation[];
}

/** Load an expert + all their stored evaluations for the wizard. */
export async function getExpertForCvWizardAction(expertId: string): Promise<ExpertWithHistory> {
  await requireAdmin();
  const [expert, evaluations] = await Promise.all([
    getExpertById(expertId),
    getEvaluationsForExpert(expertId),
  ]);
  if (!expert) throw new Error("Expert not found");
  return { expert, evaluations };
}

/**
 * Generate the tailored DOCX from the wizard result, upload to SharePoint,
 * and register the CV under the expert in the bank.
 */
export async function saveCvWizardResultAction(input: {
  expertId: string;
  expertName: string;
  result: unknown;
  templateId: string;
  projectId: string;
  projectName: string;
  proposedPosition?: string;
  torExcerptId?: string;
  personData?: unknown;
}) {
  const user = await requireAdmin();
  const base = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

  // 1. Generate DOCX via Python service
  const body: Record<string, unknown> = { result: input.result, template_id: input.templateId };
  if (input.templateId === "custom1" && input.personData) body.person_data = input.personData;
  const r = await fetch(`${base}/generate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`CV generation failed (HTTP ${r.status})`);
  const buffer = Buffer.from(await r.arrayBuffer());

  // 2. Upload to SharePoint document library
  const safeExpert = (input.expertName || "Expert").replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_") || "Expert";
  const stamp = new Date().toISOString().slice(0, 10);
  const folder = input.projectId ? `ProjectPartner/${input.projectId}/Tailored CVs` : "ProjectPartner/Tailored CVs";
  const isPdf = input.templateId === "latex_modern";
  const ext = isPdf ? "pdf" : "docx";
  const mime = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const fileName = `${safeExpert}_${input.templateId}_${stamp}.${ext}`;
  const drivePath = `${folder}/${fileName}`;
  const item = await uploadDriveFile(drivePath, buffer, mime);

  // 3. Register CV in the bank under this expert
  await createBankCv({
    expertId: input.expertId,
    fileName,
    drivePath,
    format: input.templateId,
    tailored: true,
    torExcerptId: input.torExcerptId || "",
    projectId: input.projectId,
    createdBy: user.email,
  });

  return { ok: true, fileName, webUrl: (item as { webUrl?: string }).webUrl || "" };
}
