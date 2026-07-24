const EXPERTS = "ExpertBank";
const CVS = "ExpertCvBank";
const EVALS = "ExpertEvaluationBank";
const INTAKES = "ExpertCvIntake";

// ── Types ────────────────────────────────────────────────────────────────────
export type ExpertStatus = "available" | "offered" | "booked" | "locked" | "inactive";

/** Two-way booking: soft = reserved but still bookable by others; hard = confirmed & exclusive. */
export type BookingType = "" | "soft" | "hard";

export interface BankExpert {
  id: string;
  normalizedKey: string;
  expertName: string;
  email: string;
  position: string;
  nationality: string;
  currentLocation: string;
  level: string;
  status: ExpertStatus;
  bookingType: BookingType;
  lockedByPartnerId: string;
  lockedByPartnerName: string;
  assignedProjectId: string;
  assignedProjectName: string;
  offeredTo: string[];
  tags: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BankCv {
  id: string;
  expertId: string;
  fileName: string;
  drivePath: string;
  format: string;            // giz | eu | ucep | custom1 | original
  tailored: boolean;
  torExcerptId: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  previewUrl?: string;
  downloadUrl?: string;
}

export interface BankEvaluation {
  id: string;
  expertId: string;
  expertName: string;
  projectId: string;
  projectName: string;
  matrixId: string;
  torExcerptId: string;
  proposedPosition: string;
  cvId: string;
  cvFileName: string;
  format: string;
  result: unknown;           // full TailorResult
  torMatchPct: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  strengths: string;
  gaps: string;
  torAnalysis: string;
  adjusted: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  /** True when this record was pulled in from the legacy per-project evaluation matrix
   *  (ProjectEvaluations list) rather than the Expert Bank's own evaluation store. */
  legacySource?: boolean;
}

interface SpItem<T> { id: string; fields: T }

// ── Normalization / dedup key ────────────────────────────────────────────────
export function normalizeExpertKey(opts: { email?: string; name?: string }): string {
  const email = (opts.email || "").trim().toLowerCase();
  if (email && /\S+@\S+\.\S+/.test(email)) return email;
  return (opts.name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolvePreferredCvId(cvs: BankCv[], preferredId?: string | null): string | null {
  if (preferredId) return cvs.some((cv) => cv.id === preferredId) ? preferredId : null;
  const sorted = [...cvs].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return sorted[0]?.id ?? null;
}

export function isExpertVisibleToPartner(expert: BankExpert, partnerId: string): boolean {
  if (expert.status === "inactive") return false;
  if (!partnerId) return true;
  if (expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    return false;
  }
  return true;
}

async function getLegacyExpertsFromIntakes(): Promise<BankExpert[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(INTAKES);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/Title ne ''&$top=200`
  );
  const rows = res?.value || [];
  const out: BankExpert[] = [];
  for (const row of rows) {
    const f = row.fields;
    const name = (f.Title || "").trim();
    if (!name) continue;
    const expert = await findOrCreateExpert({
      expertName: name,
      email: f.Email || "",
      position: f.Position || "",
      createdBy: f.CreatedBy || "",
    });
    out.push(expert.expert);
  }
  return out;
}

// ── Mappers ──────────────────────────────────────────────────────────────────
function mapExpert(item: SpItem<Record<string, string>>): BankExpert {
  const f = item.fields;
  let offeredTo: string[] = [];
  try { offeredTo = f.OfferedToJson ? JSON.parse(f.OfferedToJson) : []; } catch { offeredTo = []; }
  return {
    id: item.id,
    normalizedKey: f.NormalizedKey || "",
    expertName: f.ExpertName || "",
    email: f.Email || "",
    position: f.Position || "",
    nationality: f.Nationality || "",
    currentLocation: f.CurrentLocation || "",
    level: f.Level || "",
    status: (f.Status as ExpertStatus) || "available",
    bookingType: (f.BookingType as BookingType) || "",
    lockedByPartnerId: f.LockedByPartnerId || "",
    lockedByPartnerName: f.LockedByPartnerName || "",
    assignedProjectId: f.AssignedProjectId || "",
    assignedProjectName: f.AssignedProjectName || "",
    offeredTo: Array.isArray(offeredTo) ? offeredTo : [],
    tags: f.Tags || "",
    createdBy: f.CreatedBy || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

import { createSignedCvAccessUrl } from "@/lib/signed-cv-url";

function mapCv(item: SpItem<Record<string, string>>): BankCv {
  const f = item.fields;
  return {
    id: item.id,
    expertId: f.ExpertId || "",
    fileName: f.FileName || "",
    drivePath: f.DrivePath || "",
    format: f.Format || "original",
    tailored: f.Tailored === "true",
    torExcerptId: f.TorExcerptId || "",
    projectId: f.ProjectId || "",
    createdBy: f.CreatedBy || "",
    createdAt: f.CreatedAt || "",
    previewUrl: createSignedCvAccessUrl(item.id),
    downloadUrl: createSignedCvAccessUrl(item.id, { download: true }),
  };
}

function mapEval(item: SpItem<Record<string, string>>): BankEvaluation {
  const f = item.fields;
  let result: unknown = null;
  try { result = f.ResultJson ? JSON.parse(f.ResultJson) : null; } catch { result = null; }
  return {
    id: item.id,
    expertId: f.ExpertId || "",
    expertName: f.ExpertName || "",
    projectId: f.ProjectId || "",
    projectName: f.ProjectName || "",
    matrixId: f.MatrixId || "",
    torExcerptId: f.TorExcerptId || "",
    proposedPosition: f.ProposedPosition || "",
    cvId: f.CvId || "",
    cvFileName: f.CvFileName || "",
    format: f.Format || "",
    result,
    torMatchPct: Number(f.TorMatchPct || 0) || 0,
    totalScore: Number(f.TotalScore || 0) || 0,
    maxScore: Number(f.MaxScore || 0) || 0,
    percentage: Number(f.Percentage || 0) || 0,
    strengths: f.Strengths || "",
    gaps: f.Gaps || "",
    torAnalysis: f.TorAnalysis || "",
    adjusted: f.Adjusted === "true",
    createdBy: f.CreatedBy || "",
    createdAt: f.CreatedAt || "",
    updatedAt: f.UpdatedAt || undefined,
  };
}

// ── Expert CRUD + dedup ──────────────────────────────────────────────────────
export async function getExperts(): Promise<BankExpert[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EXPERTS);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(`${base}?$expand=fields&$top=1000`);
  const experts = (res?.value || []).map(mapExpert);
  if (experts.length === 0) {
    const seeded = await getLegacyExpertsFromIntakes();
    return seeded.sort((a, b) => a.expertName.localeCompare(b.expertName));
  }
  return experts.sort((a, b) => a.expertName.localeCompare(b.expertName));
}

export async function getExpertById(id: string): Promise<BankExpert | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EXPERTS);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapExpert(item) : null;
}

export async function findExpertByKey(normalizedKey: string): Promise<BankExpert | null> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EXPERTS);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/NormalizedKey eq '${escapeOData(normalizedKey)}'&$top=1`
  );
  const item = res?.value?.[0];
  return item ? mapExpert(item) : null;
}

/** Find an existing expert (by email/name) or create a new one. Never duplicates. */
export async function findOrCreateExpert(identity: {
  expertName: string; email?: string; position?: string; nationality?: string; currentLocation?: string; level?: string; createdBy?: string;
}): Promise<{ expert: BankExpert; created: boolean }> {
  const key = normalizeExpertKey({ email: identity.email, name: identity.expertName });
  if (!key) throw new Error("Cannot identify expert (no name or email).");
  const existing = await findExpertByKey(key);
  if (existing) {
    // Enrich missing fields opportunistically
    const patch: Partial<BankExpert> = {};
    if (!existing.email && identity.email) patch.email = identity.email;
    if (!existing.position && identity.position) patch.position = identity.position;
    if (!existing.nationality && identity.nationality) patch.nationality = identity.nationality;
    if (!existing.currentLocation && identity.currentLocation) patch.currentLocation = identity.currentLocation;
    if (!existing.level && identity.level) patch.level = identity.level;
    if (Object.keys(patch).length) await updateExpert(existing.id, patch);
    return { expert: { ...existing, ...patch }, created: false };
  }
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(EXPERTS), {
    fields: {
      Title: identity.expertName.slice(0, 250),
      NormalizedKey: key,
      ExpertName: identity.expertName,
      Email: identity.email || "",
      Position: identity.position || "",
      Nationality: identity.nationality || "",
      CurrentLocation: identity.currentLocation || "",
      Level: identity.level || "",
      Status: "available",
      OfferedToJson: "[]",
      CreatedBy: identity.createdBy || "",
      CreatedAt: now,
    },
  });
  const expert: BankExpert = {
    id: res.id, normalizedKey: key, expertName: identity.expertName, email: identity.email || "",
    position: identity.position || "", nationality: identity.nationality || "", currentLocation: identity.currentLocation || "",
    level: identity.level || "", status: "available", bookingType: "", lockedByPartnerId: "", lockedByPartnerName: "", assignedProjectId: "",
    assignedProjectName: "", offeredTo: [], tags: "", createdBy: identity.createdBy || "", createdAt: now,
  };
  return { expert, created: true };
}

export async function updateExpert(id: string, patch: Partial<BankExpert>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EXPERTS);
  const fields: Record<string, string> = { UpdatedAt: new Date().toISOString() };
  if (patch.expertName !== undefined) fields.ExpertName = patch.expertName;
  if (patch.email !== undefined) fields.Email = patch.email;
  if (patch.position !== undefined) fields.Position = patch.position;
  if (patch.nationality !== undefined) fields.Nationality = patch.nationality;
  if (patch.currentLocation !== undefined) fields.CurrentLocation = patch.currentLocation;
  if (patch.level !== undefined) fields.Level = patch.level;
  if (patch.status !== undefined) fields.Status = patch.status;
  if (patch.bookingType !== undefined) fields.BookingType = patch.bookingType;
  if (patch.lockedByPartnerId !== undefined) fields.LockedByPartnerId = patch.lockedByPartnerId;
  if (patch.lockedByPartnerName !== undefined) fields.LockedByPartnerName = patch.lockedByPartnerName;
  if (patch.assignedProjectId !== undefined) fields.AssignedProjectId = patch.assignedProjectId;
  if (patch.assignedProjectName !== undefined) fields.AssignedProjectName = patch.assignedProjectName;
  if (patch.offeredTo !== undefined) fields.OfferedToJson = JSON.stringify(patch.offeredTo);
  if (patch.tags !== undefined) fields.Tags = patch.tags;
  await graphPatch(`${base}/${id}/fields`, fields);
}

// ── Locking / availability ───────────────────────────────────────────────────
/** Book (lock) an expert for one partner. After this, other partners cannot see the expert. */
export async function bookExpert(expertId: string, partnerId: string, partnerName: string, projectId?: string, projectName?: string): Promise<void> {
  // Backwards-compatible entry point → performs a hard (exclusive) booking.
  await hardBookExpert(expertId, partnerId, partnerName, projectId, projectName);
}

export async function setExpertInactiveState(expertId: string, inactive: boolean): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  await updateExpert(expertId, {
    status: inactive ? "inactive" : "available",
    bookingType: "",
    lockedByPartnerId: "",
    lockedByPartnerName: "",
    assignedProjectId: "",
    assignedProjectName: "",
    offeredTo: [],
  });
  const { getStaffingByExpertId, updateStaffing } = await import("@/lib/projects");
  const rows = await getStaffingByExpertId(expertId);
  for (const row of rows) {
    await updateStaffing(row.id, { activeStatus: inactive ? "unavailable" : "active" });
  }
}

export async function deleteExpertFromBank(expertId: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) return;
  const [cvs, evaluations] = await Promise.all([
    getCvsForExpert(expertId),
    getEvaluationsForExpert(expertId),
  ]);
  await Promise.all([
    ...cvs.map((cv) => deleteBankCv(cv.id)),
    ...evaluations.map((ev) => deleteBankEvaluation(ev.id)),
  ]);
  const { getStaffingByExpertId, deleteStaffing } = await import("@/lib/projects");
  const rows = await getStaffingByExpertId(expertId);
  for (const row of rows) {
    await deleteStaffing(row.id);
  }
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EXPERTS);
  await graphDelete(`${base}/${expertId}`);
}

/**
 * Soft booking: the partner reserves the expert, but the expert stays visible and
 * bookable by other partners. Blocked only if another partner already HARD-booked.
 */
export async function softBookExpert(expertId: string, partnerId: string, partnerName: string, projectId?: string, projectName?: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  if (expert.status === "inactive") throw new Error("This expert is inactive and cannot be booked.");
  if (expert.bookingType === "hard" && expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    throw new Error("Expert is already confirmed (hard-booked) by another partner.");
  }
  await updateExpert(expertId, {
    status: "booked",
    bookingType: "soft",
    lockedByPartnerId: partnerId,
    lockedByPartnerName: partnerName,
    assignedProjectId: projectId || expert.assignedProjectId,
    assignedProjectName: projectName || expert.assignedProjectName,
  });
}

/**
 * Hard booking: the partner confirms exclusive use. After this the expert becomes
 * invisible/unbookable for every other partner.
 */
export async function hardBookExpert(expertId: string, partnerId: string, partnerName: string, projectId?: string, projectName?: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  if (expert.status === "inactive") throw new Error("This expert is inactive and cannot be booked.");
  if (expert.bookingType === "hard" && expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    throw new Error("Expert is already confirmed (hard-booked) by another partner.");
  }
  await updateExpert(expertId, {
    status: "locked",
    bookingType: "hard",
    lockedByPartnerId: partnerId,
    lockedByPartnerName: partnerName,
    assignedProjectId: projectId || expert.assignedProjectId,
    assignedProjectName: projectName || expert.assignedProjectName,
  });
}

/** Confirm a soft booking into a hard (exclusive) booking. Only the holding partner may confirm. */
export async function confirmBooking(expertId: string, partnerId: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  if (expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    throw new Error("Only the reserving partner can confirm this booking.");
  }
  await updateExpert(expertId, { status: "locked", bookingType: "hard" });
}

/** Release a booked/locked expert back to the pool (admin or the holding partner). */
export async function releaseExpert(expertId: string): Promise<void> {
  await updateExpert(expertId, {
    status: "available", bookingType: "", lockedByPartnerId: "", lockedByPartnerName: "",
    assignedProjectId: "", assignedProjectName: "",
  });
}

/** Offer an expert to a partner (adds to offeredTo, sets status offered if still available). */
export async function offerExpertToPartner(expertId: string, partnerId: string): Promise<void> {
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  if (expert.status === "inactive") throw new Error("This expert is inactive and cannot be offered.");
  if (expert.bookingType === "hard") return; // already exclusively booked
  const offeredTo = Array.from(new Set([...(expert.offeredTo || []), partnerId]));
  await updateExpert(expertId, { offeredTo, status: expert.status === "available" ? "offered" : expert.status });
}

/**
 * Experts a partner may see: everything except experts HARD-booked by another partner.
 * Soft-booked experts remain visible (with a soft-hold indicator) so others can still book.
 */
export async function getExpertsForPartner(partnerId: string): Promise<BankExpert[]> {
  const all = await getExperts();
  return all.filter((e) => isExpertVisibleToPartner(e, partnerId));
}

// ── Central sync: projects ⇆ Master Expert Bank ──────────────────────────────
export interface ImportSummary {
  projectsScanned: number;
  staffingScanned: number;
  expertsCreated: number;
  expertsLinked: number;
  cvsLinked: number;
}

/**
 * Migrate/sync every existing project-staffing expert into the Master Expert Bank.
 * - De-duplicates by email/name so each real person exists once in the bank.
 * - Back-links the ProjectStaffing row to the canonical bank expert (ExpertId), which
 *   turns the bank into the single source of truth for all project-related menus.
 * - Registers the project CV (if any) as a bank CV so the whole CV history lives centrally.
 * Idempotent: running it again only fills gaps, it never duplicates experts or CVs.
 */
export async function importExpertsFromProjects(createdBy = "system"): Promise<ImportSummary> {
  const { getProjects, getAllStaffing, updateStaffing } = await import("@/lib/projects");
  const [projects, staffing] = await Promise.all([getProjects(), getAllStaffing()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const summary: ImportSummary = {
    projectsScanned: projects.length,
    staffingScanned: staffing.length,
    expertsCreated: 0,
    expertsLinked: 0,
    cvsLinked: 0,
  };

  for (const row of staffing) {
    const name = (row.expertName || "").trim();
    if (!name) continue;

    const { expert, created } = await findOrCreateExpert({
      expertName: name,
      position: row.position || "",
      level: row.position || "",
      createdBy,
    });
    if (created) summary.expertsCreated++;

    // Enrich the bank record with any richer detail captured on the staffing row.
    const patch: Partial<BankExpert> = {};
    if (!expert.position && row.position) patch.position = row.position;
    if (!expert.level && row.position) patch.level = row.position;
    if (!expert.tags && row.expertise) patch.tags = row.expertise;
    if (Object.keys(patch).length) await updateExpert(expert.id, patch);

    // Back-link the project staffing row to the canonical bank expert.
    if (row.expertId !== expert.id) {
      await updateStaffing(row.id, { expertId: expert.id });
      summary.expertsLinked++;
    }

    // Register the project CV centrally (dedup by file name).
    if (row.cvFileName) {
      const existing = await getCvsForExpert(expert.id);
      const already = existing.some((c) => c.fileName === row.cvFileName);
      if (!already) {
        const project = projectById.get(row.projectId);
        await createBankCv({
          expertId: expert.id,
          fileName: row.cvFileName,
          drivePath: `ProjectPartner/${row.projectId}/CVs/${row.cvFileName}`,
          format: "original",
          tailored: false,
          torExcerptId: "",
          projectId: row.projectId,
          createdBy: project?.partnerEmail || createdBy,
        });
        summary.cvsLinked++;
      }
    }
  }

  return summary;
}

/**
 * Propagate a central identity change to every project that references this expert,
 * so editing an expert once in the Master Expert Bank updates all linked project menus.
 */
export async function propagateExpertIdentityToProjects(expertId: string, patch: { expertName?: string }): Promise<number> {
  if (!patch.expertName) return 0;
  const { getStaffingByExpertId, updateStaffing } = await import("@/lib/projects");
  const rows = await getStaffingByExpertId(expertId);
  let updated = 0;
  for (const row of rows) {
    if (row.expertName !== patch.expertName) {
      await updateStaffing(row.id, { expertName: patch.expertName });
      updated++;
    }
  }
  return updated;
}

// ── CV bank ──────────────────────────────────────────────────────────────────
export async function createBankCv(d: Omit<BankCv, "id" | "createdAt">): Promise<BankCv> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(CVS), {
    fields: {
      Title: d.fileName.slice(0, 250), ExpertId: d.expertId, FileName: d.fileName,
      DrivePath: d.drivePath, Format: d.format, Tailored: d.tailored ? "true" : "false",
      TorExcerptId: d.torExcerptId, ProjectId: d.projectId, CreatedBy: d.createdBy, CreatedAt: now,
    },
  });
  return { ...d, id: res.id, createdAt: now };
}

export async function getCvsForExpert(expertId: string): Promise<BankCv[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CVS);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ExpertId eq '${escapeOData(expertId)}'&$top=200`
  );
  return (res?.value || []).map(mapCv).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getBankCvById(id: string): Promise<BankCv | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CVS);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapCv(item) : null;
}

export async function deleteBankCv(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CVS);
  await graphDelete(`${base}/${id}`);
}

export async function updateBankCv(id: string, patch: Partial<BankCv>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(CVS);
  const fields: Record<string, string> = {};
  if (patch.fileName !== undefined) fields.FileName = patch.fileName;
  if (patch.drivePath !== undefined) fields.DrivePath = patch.drivePath;
  if (patch.format !== undefined) fields.Format = patch.format;
  if (patch.tailored !== undefined) fields.Tailored = patch.tailored ? "true" : "false";
  if (patch.torExcerptId !== undefined) fields.TorExcerptId = patch.torExcerptId;
  if (patch.projectId !== undefined) fields.ProjectId = patch.projectId;
  await graphPatch(`${base}/${id}/fields`, fields);
}

// ── Evaluation bank ──────────────────────────────────────────────────────────
export async function createBankEvaluation(d: Omit<BankEvaluation, "id" | "createdAt" | "updatedAt">): Promise<BankEvaluation> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  const now = new Date().toISOString();
  const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(EVALS), {
    fields: {
      Title: `${d.expertName} — ${d.projectName || "eval"}`.slice(0, 250),
      ExpertId: d.expertId, ExpertName: d.expertName, ProjectId: d.projectId, ProjectName: d.projectName,
      MatrixId: d.matrixId, TorExcerptId: d.torExcerptId, ProposedPosition: d.proposedPosition || "", CvId: d.cvId, CvFileName: d.cvFileName, Format: d.format,
      ResultJson: JSON.stringify(d.result ?? {}).slice(0, 60000),
      TorMatchPct: d.torMatchPct, TotalScore: d.totalScore, MaxScore: d.maxScore, Percentage: d.percentage,
      Strengths: (d.strengths || "").slice(0, 8000), Gaps: (d.gaps || "").slice(0, 8000),
      TorAnalysis: (d.torAnalysis || "").slice(0, 8000), Adjusted: d.adjusted ? "true" : "false",
      CreatedBy: d.createdBy, CreatedAt: now,
    },
  });
  return { ...d, id: res.id, createdAt: now };
}

export async function getEvaluationsForExpert(expertId: string): Promise<BankEvaluation[]> {
  const { graphGetSafe, getSiteListUrlAsync, escapeOData } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVALS);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(
    `${base}?$expand=fields&$filter=fields/ExpertId eq '${escapeOData(expertId)}'&$top=200`
  );
  return (res?.value || []).map(mapEval).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/** Central lookup for an expert's full evaluation history: combines the Expert Bank's own
 *  evaluation store with any legacy per-project evaluations (recorded before/outside the
 *  Evaluation Wizard) so the Master Expert Bank stays the single source of truth. */
export async function getAllEvaluationsForExpert(expert: Pick<BankExpert, "id" | "expertName">): Promise<BankEvaluation[]> {
  const [bankEvals, legacyEvals] = await Promise.all([
    getEvaluationsForExpert(expert.id),
    (async () => {
      const { getEvaluationsForExpertName } = await import("@/lib/evaluation");
      const { getProjectById } = await import("@/lib/projects");
      const rows = await getEvaluationsForExpertName(expert.expertName);
      const projectNameCache = new Map<string, string>();
      const out: BankEvaluation[] = [];
      for (const row of rows) {
        let projectName = projectNameCache.get(row.projectId) || "";
        if (!projectName && row.projectId) {
          const project = await getProjectById(row.projectId);
          projectName = project?.name || "";
          projectNameCache.set(row.projectId, projectName);
        }
        out.push({
          id: `legacy-${row.id}`,
          expertId: expert.id,
          expertName: expert.expertName,
          projectId: row.projectId,
          projectName,
          matrixId: "",
          torExcerptId: "",
          proposedPosition: row.position,
          cvId: "",
          cvFileName: row.cvFileName || "",
          format: row.evalType,
          result: null,
          torMatchPct: 0,
          totalScore: row.totalScore,
          maxScore: row.maxScore,
          percentage: row.percentage,
          strengths: "",
          gaps: "",
          torAnalysis: row.notes || "",
          adjusted: false,
          createdBy: "",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          legacySource: true,
        });
      }
      return out;
    })(),
  ]);
  return [...bankEvals, ...legacyEvals].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getBankEvaluationById(id: string): Promise<BankEvaluation | null> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVALS);
  const item = await graphGetSafe<SpItem<Record<string, string>>>(`${base}/${id}?$expand=fields`);
  return item ? mapEval(item) : null;
}

export async function deleteBankEvaluation(id: string): Promise<void> {
  const { graphDelete, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVALS);
  await graphDelete(`${base}/${id}`);
}

export async function updateBankEvaluation(id: string, patch: Partial<BankEvaluation>): Promise<void> {
  const { graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(EVALS);
  const fields: Record<string, string | number> = { UpdatedAt: new Date().toISOString() };
  if (patch.strengths !== undefined) fields.Strengths = patch.strengths.slice(0, 8000);
  if (patch.gaps !== undefined) fields.Gaps = patch.gaps.slice(0, 8000);
  if (patch.torAnalysis !== undefined) fields.TorAnalysis = patch.torAnalysis.slice(0, 8000);
  if (patch.torMatchPct !== undefined) fields.TorMatchPct = patch.torMatchPct;
  if (patch.result !== undefined) fields.ResultJson = JSON.stringify(patch.result ?? {}).slice(0, 60000);
  if (patch.adjusted !== undefined) fields.Adjusted = patch.adjusted ? "true" : "false";
  await graphPatch(`${base}/${id}/fields`, fields);
}
