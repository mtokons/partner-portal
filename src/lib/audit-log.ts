/**
 * Audit Log — Immutable append-only audit trail
 *
 * All security-sensitive operations MUST write to this log.
 * Writes only via Admin SDK (server-side). Never from client.
 */

import { getAdminFirestore } from "./firebase-admin";
import { generateSccgId } from "./sccg-id";
import * as admin from "firebase-admin";

export interface WriteAuditLogParams {
  action: string;
  actorId: string;
  actorEmail: string;
  targetId: string;
  targetType: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an immutable audit log entry. Server-side only.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<string> {
  const db = getAdminFirestore();
  const sccgId = await generateSccgId("AUD");

  const entry = {
    sccgId,
    action: params.action,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    targetId: params.targetId,
    targetType: params.targetType,
    before: params.before || null,
    after: params.after || null,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
    metadata: params.metadata || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("auditLogs").add(entry);
  return ref.id;
}

/**
 * Query audit logs with filters. Admin-only.
 */
export async function getAuditLogs(filters?: {
  action?: string;
  actorId?: string;
  targetId?: string;
  targetType?: string;
  limitCount?: number;
}): Promise<Array<Record<string, unknown>>> {
  const db = getAdminFirestore();
  let q: FirebaseFirestore.Query = db.collection("auditLogs").orderBy("createdAt", "desc");

  if (filters?.action) q = q.where("action", "==", filters.action);
  if (filters?.actorId) q = q.where("actorId", "==", filters.actorId);
  if (filters?.targetId) q = q.where("targetId", "==", filters.targetId);
  if (filters?.targetType) q = q.where("targetType", "==", filters.targetType);

  q = q.limit(filters?.limitCount || 50);

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
