"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  createTorExcerpt,
  deleteTorExcerpt,
  type TorExcerptStructure,
} from "@/lib/tor-excerpts";
import {
  createEvaluationMatrix,
  deleteEvaluationMatrix,
  type MatrixCriterion,
} from "@/lib/eval-matrices";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

interface SaveTorInput {
  projectId: string;
  projectName: string;
  role: string;
  position: string;
  fileName: string;
  summary: string;
  excerptText: string;
  structure: TorExcerptStructure;
  rawText: string;
  provider: string;
}

export async function saveTorExcerptAction(input: SaveTorInput) {
  const user = await requireAdmin();
  await createTorExcerpt({
    projectId: input.projectId || "",
    projectName: input.projectName || "",
    role: input.role || "",
    position: input.position || "",
    fileName: input.fileName || "",
    summary: input.summary || "",
    excerptText: input.excerptText || "",
    structure: input.structure || null,
    rawText: input.rawText || "",
    provider: input.provider || "",
    createdBy: user.email || user.name || "admin",
  });
  revalidatePath("/admin/tor-library");
  return { ok: true };
}

export async function deleteTorExcerptAction(id: string) {
  await requireAdmin();
  await deleteTorExcerpt(id);
  revalidatePath("/admin/tor-library");
  return { ok: true };
}

interface SaveMatrixInput {
  projectId: string;
  projectName: string;
  role: string;
  fileName: string;
  criteria: MatrixCriterion[];
  rawText: string;
  provider: string;
}

export async function saveEvaluationMatrixAction(input: SaveMatrixInput) {
  const user = await requireAdmin();
  const criteria = (input.criteria || [])
    .map((c) => ({ label: String(c.label || "").trim(), maxPoints: Number(c.maxPoints) || 0 }))
    .filter((c) => c.label);
  if (!criteria.length) throw new Error("At least one criterion is required");
  await createEvaluationMatrix({
    projectId: input.projectId || "",
    projectName: input.projectName || "",
    role: input.role || "",
    fileName: input.fileName || "",
    criteria,
    rawText: input.rawText || "",
    provider: input.provider || "",
    createdBy: user.email || user.name || "admin",
  });
  revalidatePath("/admin/tor-library");
  return { ok: true };
}

export async function deleteEvaluationMatrixAction(id: string) {
  await requireAdmin();
  await deleteEvaluationMatrix(id);
  revalidatePath("/admin/tor-library");
  return { ok: true };
}
