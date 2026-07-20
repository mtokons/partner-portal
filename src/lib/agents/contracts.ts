import { z } from "zod";

/**
 * Agent I/O contracts — the single source of truth for every AI agent's shape.
 * The persona system prompts describe the behaviour; these schemas enforce it.
 * Phase 0 + Phase 1 wire the Judge; other personas are declared for forward use.
 */

export const AGENT_PERSONAS = ["tor", "cv", "judge", "report"] as const;
export type AgentPersona = (typeof AGENT_PERSONAS)[number];

// ── Persona 1 — ToR structure extraction ─────────────────────────────────────

const QualReqSchema = z.object({
  text: z.string(),
  category: z.string().nullable().optional(),
  durationYears: z.number().nullable().optional(),
  binary: z.boolean().optional(),
});

const TorRoleSchema = z.object({
  roleName: z.string(),
  mandatory: z.array(QualReqSchema).default([]),
  preferred: z.array(QualReqSchema).default([]),
});

const SectorGroupSchema = z.object({
  groupLabel: z.string(),                // e.g. "TVET / Vocational Education"
  sectors: z.array(z.string()),          // individual sector labels in this group
  mode: z.enum(["cumulative", "individual"]),
  // cumulative: sum years across all sectors in the group; individual: each sector scored separately
});

export const TorStructureSchema = z.object({
  error: z.string().nullable().optional(),          // "not_a_tor" when wrong doc
  detectedContent: z.string().nullable().optional(),
  projectTitle: z.string().nullable(),
  donor: z.string().nullable(),
  projectCountry: z.string().nullable().optional(), // country where the project runs
  bangladeshProject: z.boolean().optional(),        // true → non-BD experience counts as international
  expertRoles: z.array(TorRoleSchema).default([]),
  sectorGroups: z.array(SectorGroupSchema).default([]),  // grouped sector criteria for team formation
  deliverables: z.array(z.string()).default([]),
});
export type TorStructure = z.infer<typeof TorStructureSchema>;
export type TorRole = z.infer<typeof TorRoleSchema>;
export type SectorGroup = z.infer<typeof SectorGroupSchema>;

/** A stored ToR document + its extracted structure, backing the ToR Analyzer UI. */
export interface TorDocument {
  id: string;
  projectId: string;
  fileName: string;
  rawText: string;
  structure: TorStructure | null;
  status: "draft" | "approved";
  provider: string;
  runId: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Persona 2 — CV structural extraction ─────────────────────────────────────

const CvEntrySchema = z.object({
  title: z.string(),
  institution: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(), // YYYY-MM or YYYY
  endDate: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
});

const CvExperienceSchema = z.object({
  title: z.string(),
  org: z.string().nullable().optional(),
  country: z.string().nullable().optional(),   // country where the work took place
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  durationMonths: z.number().nullable().optional(),
  durationEstimated: z.boolean().optional(),
  description: z.string(),
  conflict: z.boolean().optional(),
});

export const CvProfileSchema = z.object({
  fullName: z.string().nullable().optional(),
  education: z.array(CvEntrySchema).default([]),
  training: z.array(CvEntrySchema).default([]),
  languages: z.array(z.object({ language: z.string(), statedLevel: z.string().nullable().optional() })).default([]),
  professionalExperience: z.array(CvExperienceSchema).default([]),
  sectionConfidence: z.object({
    education: z.number().min(0).max(1),
    training: z.number().min(0).max(1),
    languages: z.number().min(0).max(1),
    professionalExperience: z.number().min(0).max(1),
  }),
});
export type CvProfile = z.infer<typeof CvProfileSchema>;

// ── Persona 3 — Scoring / evaluation judge (one criterion per call) ──────────

export const CriterionScoreSchema = z.object({
  score: z.number(),
  evidence: z.string().nullable(),      // <25 words; must exist in the source CV
  confidence: z.number().min(0).max(1), // < 0.6 → route to human review
  reasoning: z.string(),
});
export type RawCriterionScore = z.infer<typeof CriterionScoreSchema>;

/** The persisted, verified score for one criterion after guardrails run. */
export interface CriterionScore {
  criterionKey: string;
  score: number;
  maxPoints: number;
  evidence: string | null;
  evidenceVerified: boolean;   // did the quoted text actually appear in the CV?
  confidence: number;
  reasoning: string;
  threshold: boolean;          // binary (must-have) vs proportional criterion
  needsReview: boolean;        // confidence < gate OR evidence unverified
  provider: string;
  runId: string;
}

// ── Shared run metadata (audit) ──────────────────────────────────────────────

export const AGENT_RUN_STATUSES = ["ok", "invalid_json", "schema_error", "error", "mock"] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export interface AgentRunRecord {
  id: string;
  persona: AgentPersona;
  promptVersion: string;
  provider: string;
  model: string;
  inputHash: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs: number;
  status: AgentRunStatus;
  contextRef?: string;         // e.g. "intake:123/criterion:education"
  createdAt: string;
}

/** Confidence at/under which a score is flagged for human review. */
export const REVIEW_CONFIDENCE_GATE = 0.6;

// ── Persona 4 — Report drafting ──────────────────────────────────────────────

export const DraftSectionSchema = z.object({
  section: z.string(),
  markdown: z.string(),
  editorNotes: z.array(z.string()).default([]),
  sourceRefs: z.array(z.string()).default([]),
});
export type DraftSection = z.infer<typeof DraftSectionSchema>;

/** A stored deliverable draft (Persona 4 output). */
export interface Deliverable {
  id: string;
  projectId: string;
  section: string;
  draftText: string;
  editorNotes: string[];
  sourceRefs: string[];
  status: "draft" | "final";
  provider: string;
  runId: string;
  createdAt: string;
  updatedAt?: string;
}

/** A persisted per-criterion judge result, backing the human review queue. */
export interface EvaluationScoreDetail {
  id: string;
  evaluationId: string;
  intakeId: string;
  projectId: string;
  criterionKey: string;
  criterionLabel: string;
  category: string;
  aiScore: number;             // the judge's (guardrailed) score
  score: number;               // current score (human may override)
  maxPoints: number;
  evidence: string | null;
  evidenceVerified: boolean;
  confidence: number;
  reasoning: string;
  threshold: boolean;
  needsReview: boolean;
  reviewed: boolean;           // a human has resolved this flag
  reviewedBy?: string;
  provider: string;
  runId: string;
  createdAt: string;
  updatedAt?: string;
}
