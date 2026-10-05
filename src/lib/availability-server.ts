import "server-only";
import { AVAILABILITY_CONFIG, STATUS_LABELS } from "./availability-config";
import type { TeamAvailability, AvailabilityAudit, AvailabilityStatus, AvailabilityTimeSlot } from "@/types";
import {
  validateAvailabilityInput,
  checkColleagueEditPermission,
  parseAvailabilitySlots,
} from "./availability";

const AVAIL_COL = {
  title: "Title",
  userId: "UserId",
  userName: "UserName",
  userEmail: "UserEmail",
  department: "Department",
  date: "Date",
  status: "Status",
  startTime: "StartTime",
  endTime: "EndTime",
  note: "Note",
  createdBy: "CreatedBy",
  updatedBy: "UpdatedBy",
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
};

const AUDIT_COL = {
  title: "Title",
  availabilityId: "AvailabilityId",
  userId: "UserId",
  date: "Date",
  action: "Action",
  changedBy: "ChangedBy",
  changedAt: "ChangedAt",
  oldValue: "OldValue",
  newValue: "NewValue",
  reason: "Reason",
};

function isListNotFoundError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  const status = err.statusCode || err.status;
  return (
    status === 404 ||
    code === "itemnotfound" ||
    msg.includes("specified list was not found") ||
    msg.includes("not found") ||
    msg.includes("itemnotfound")
  );
}

/**
 * Fetches availability records for a date range (inclusive).
 * First checks dedicated TeamAvailability list, falling back to ActivityLog.
 */
export async function getAvailabilityForRange(startDate: string, endDate: string): Promise<TeamAvailability[]> {
  const { graphGet, getSiteListUrlAsync } = await import("@/lib/graph");

  // 1. Try dedicated TeamAvailability list
  try {
    const listUrl = await getSiteListUrlAsync("TeamAvailability");
    const filter = `fields/${AVAIL_COL.date} ge '${startDate}' and fields/${AVAIL_COL.date} le '${endDate}'`;
    const res = await graphGet<{ value?: Array<{ id: string; fields: Record<string, any> }> }>(
      `${listUrl}?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=500`
    );

    if (res?.value && res.value.length > 0) {
      return res.value.map((item) => {
        const f = item.fields || {};
        const rawStart = f[AVAIL_COL.startTime] ? String(f[AVAIL_COL.startTime]) : undefined;
        const rawEnd = f[AVAIL_COL.endTime] ? String(f[AVAIL_COL.endTime]) : undefined;
        const parsedSlots = parseAvailabilitySlots(rawStart, rawEnd);

        return {
          id: String(item.id),
          userId: String(f[AVAIL_COL.userId] || ""),
          userName: String(f[AVAIL_COL.userName] || ""),
          userEmail: String(f[AVAIL_COL.userEmail] || ""),
          department: String(f[AVAIL_COL.department] || ""),
          date: String(f[AVAIL_COL.date] || ""),
          status: (f[AVAIL_COL.status] || "available") as AvailabilityStatus,
          startTime: rawStart,
          endTime: rawEnd,
          slots: parsedSlots.length > 0 ? parsedSlots : undefined,
          note: f[AVAIL_COL.note] ? String(f[AVAIL_COL.note]) : undefined,
          createdAt: f[AVAIL_COL.createdAt] ? String(f[AVAIL_COL.createdAt]) : undefined,
          updatedAt: f[AVAIL_COL.updatedAt] ? String(f[AVAIL_COL.updatedAt]) : undefined,
          updatedBy: f[AVAIL_COL.updatedBy] ? String(f[AVAIL_COL.updatedBy]) : undefined,
        };
      });
    }
  } catch (err: any) {
    console.warn(`[getAvailabilityForRange] TeamAvailability list query skipped: ${err?.message}`);
  }

  // 2. Fallback to ActivityLog if TeamAvailability list is not yet created
  try {
    const activityListUrl = await getSiteListUrlAsync("ActivityLog");
    const filter = `startswith(fields/Title, 'AVAILABILITY_') and fields/TargetId ge '${startDate}' and fields/TargetId le '${endDate}'`;
    const res = await graphGet<{ value?: Array<{ id: string; fields: Record<string, any> }> }>(
      `${activityListUrl}?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=500`
    );

    if (!res?.value) return [];

    return res.value.map((item) => {
      const f = item.fields || {};
      let meta: any = {};
      try {
        if (f.Description) {
          meta = JSON.parse(f.Description);
        }
      } catch (_) {}

      const rawStart = meta.startTime || "";
      const rawEnd = meta.endTime || "";
      const parsedSlots =
        meta.slots && Array.isArray(meta.slots)
          ? (meta.slots as AvailabilityTimeSlot[])
          : parseAvailabilitySlots(rawStart, rawEnd);

      const status = (meta.status ||
        (f.Action ? String(f.Action).replace(/^AVAILABILITY_/, "") : "available")) as AvailabilityStatus;

      return {
        id: String(item.id),
        userId: String(f.ActorId || ""),
        userName: String(f.ActorName || f.TargetName || ""),
        userEmail: String(f.TargetEmail || ""),
        department: String(f.ActorRole || ""),
        date: String(f.TargetId || ""),
        status: status || "available",
        startTime: rawStart || undefined,
        endTime: rawEnd || undefined,
        slots: parsedSlots.length > 0 ? parsedSlots : undefined,
        note: meta.note || undefined,
        createdAt: f.CreatedAt ? String(f.CreatedAt) : undefined,
        updatedAt: f.Modified ? String(f.Modified) : undefined,
        updatedBy: meta.updatedBy ? String(meta.updatedBy) : undefined,
      };
    });
  } catch (err: any) {
    console.warn(`[getAvailabilityForRange] ActivityLog fallback error: ${err?.message}`);
    return [];
  }
}

/**
 * Fetches availability records for a specific user across a date range.
 */
export async function getAvailabilityForUser(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TeamAvailability[]> {
  const all = await getAvailabilityForRange(startDate, endDate);
  return all.filter((r) => r.userId === userId || r.userEmail?.toLowerCase() === userId.toLowerCase());
}

/**
 * Saves availability to ActivityLog when TeamAvailability list is not present.
 */
async function saveToActivityLogFallback(
  data: {
    userId: string;
    userName: string;
    userEmail: string;
    department?: string;
    date: string;
    status: AvailabilityStatus;
    startTime?: string;
    endTime?: string;
    slots?: AvailabilityTimeSlot[];
    note?: string;
  },
  actor: { id: string; email: string; name: string; roles: string[] },
  effectiveStartTime: string,
  effectiveEndTime: string,
  effectiveSlots: AvailabilityTimeSlot[] | undefined,
  isOverride = false,
  overrideReason?: string
): Promise<{ success: boolean; record?: TeamAvailability; error?: string }> {
  try {
    const { graphGet, graphPost, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const activityListUrl = await getSiteListUrlAsync("ActivityLog");
    const titleKey = `AVAILABILITY_${data.userId}_${data.date}`;
    const nowIso = new Date().toISOString();

    const descPayload = {
      status: data.status,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      slots: effectiveSlots && effectiveSlots.length > 0 ? effectiveSlots : undefined,
      note: data.note || "",
      updatedBy: actor.email,
      updatedAt: nowIso,
    };

    // Check if entry already exists in ActivityLog
    const filter = `fields/Title eq '${titleKey}'`;
    const existing = await graphGet<{ value?: Array<{ id: string; fields: Record<string, any> }> }>(
      `${activityListUrl}?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=1`
    );

    let savedRecord: TeamAvailability;
    let actionType: AvailabilityAudit["action"] = "create";
    let oldValueStr: string | undefined;

    if (existing?.value && existing.value.length > 0) {
      const item = existing.value[0];
      const oldFields = item.fields || {};
      oldValueStr = oldFields.Description;
      actionType = isOverride ? "override" : "update";

      await graphPatch(`${activityListUrl}/${item.id}/fields`, {
        Action: `AVAILABILITY_${data.status}`,
        Description: JSON.stringify(descPayload),
        ActorName: data.userName,
        ActorRole: data.department || oldFields.ActorRole || "",
        TargetEmail: data.userEmail,
        TargetName: data.userName,
      });

      savedRecord = {
        id: String(item.id),
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        department: data.department || String(oldFields.ActorRole || ""),
        date: data.date,
        status: data.status,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots && effectiveSlots.length > 0 ? effectiveSlots : undefined,
        note: data.note,
        createdAt: String(oldFields.CreatedAt || nowIso),
        updatedAt: nowIso,
        updatedBy: actor.email,
      };
    } else {
      actionType = "create";
      const res = await graphPost<{ id: string }>(activityListUrl, {
        fields: {
          Title: titleKey,
          ActorId: data.userId,
          ActorName: data.userName,
          ActorRole: data.department || "",
          Action: `AVAILABILITY_${data.status}`,
          TargetId: data.date,
          TargetEmail: data.userEmail,
          TargetName: data.userName,
          Description: JSON.stringify({
            ...descPayload,
            createdAt: nowIso,
            createdBy: actor.email,
          }),
        },
      });

      savedRecord = {
        id: String(res.id),
        ...data,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots && effectiveSlots.length > 0 ? effectiveSlots : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        updatedBy: actor.email,
      };
    }

    // Write audit log
    await recordAuditLog({
      availabilityId: savedRecord.id,
      userId: data.userId,
      date: data.date,
      action: actionType,
      changedBy: actor.email,
      changedAt: nowIso,
      oldValue: oldValueStr,
      newValue: JSON.stringify({
        status: data.status,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots,
        note: data.note,
      }),
      reason: overrideReason || (isOverride ? "Manager override" : undefined),
    });

    return { success: true, record: savedRecord };
  } catch (err: any) {
    console.error(`[saveToActivityLogFallback] Error: ${err.message}`);
    return { success: false, error: err.message || "Failed to save availability entry." };
  }
}

/**
 * Saves or updates an availability entry with full audit logging.
 * Automatically handles missing SharePoint list by falling back to ActivityLog.
 */
export async function saveAvailabilityEntry(
  data: {
    userId: string;
    userName: string;
    userEmail: string;
    department?: string;
    date: string;
    status: AvailabilityStatus;
    startTime?: string;
    endTime?: string;
    slots?: AvailabilityTimeSlot[];
    note?: string;
  },
  actor: { id: string; email: string; name: string; roles: string[] },
  isOverride = false,
  overrideReason?: string
): Promise<{ success: boolean; record?: TeamAvailability; error?: string }> {
  // Validate input fields
  const validation = validateAvailabilityInput(data);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check permissions if colleague is self-editing without manager override
  if (!isOverride) {
    const perm = checkColleagueEditPermission(data.date);
    if (!perm.allowed) {
      return { success: false, error: perm.reason };
    }
  }

  // Normalize multiple slots or single start/end time
  let effectiveStartTime = data.startTime || "";
  let effectiveEndTime = data.endTime || "";
  let effectiveSlots = data.slots;

  if (data.slots && data.slots.length > 0) {
    effectiveStartTime = data.slots.map((s) => s.startTime).join(",");
    effectiveEndTime = data.slots.map((s) => s.endTime).join(",");
  } else if (effectiveStartTime && effectiveEndTime) {
    effectiveSlots = parseAvailabilitySlots(effectiveStartTime, effectiveEndTime);
  }

  // 1. Try to save to TeamAvailability
  try {
    const { graphGet, graphPost, graphPatch, getSiteListUrlAsync } = await import("@/lib/graph");
    const listUrl = await getSiteListUrlAsync("TeamAvailability");
    const compoundTitle = `${data.userId}_${data.date}`;

    // Check if an entry already exists for this (user_id, date) to enforce uniqueness
    const filter = `fields/${AVAIL_COL.title} eq '${compoundTitle}'`;
    const existing = await graphGet<{ value?: Array<{ id: string; fields: Record<string, any> }> }>(
      `${listUrl}?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=1`
    );

    const nowIso = new Date().toISOString();
    let savedRecord: TeamAvailability;
    let actionType: AvailabilityAudit["action"] = "create";
    let oldValueStr: string | undefined;

    if (existing?.value && existing.value.length > 0) {
      // UPDATE or OVERRIDE existing item
      const item = existing.value[0];
      const oldFields = item.fields || {};
      oldValueStr = JSON.stringify({
        status: oldFields[AVAIL_COL.status],
        startTime: oldFields[AVAIL_COL.startTime],
        endTime: oldFields[AVAIL_COL.endTime],
        note: oldFields[AVAIL_COL.note],
        updatedBy: oldFields[AVAIL_COL.updatedBy],
      });

      actionType = isOverride ? "override" : "update";

      const patchBody: Record<string, any> = {
        [AVAIL_COL.status]: data.status,
        [AVAIL_COL.startTime]: effectiveStartTime,
        [AVAIL_COL.endTime]: effectiveEndTime,
        [AVAIL_COL.note]: data.note || "",
        [AVAIL_COL.updatedBy]: actor.email,
        [AVAIL_COL.updatedAt]: nowIso,
      };

      await graphPatch(`${listUrl}/${item.id}/fields`, patchBody);

      savedRecord = {
        id: String(item.id),
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        department: data.department || String(oldFields[AVAIL_COL.department] || ""),
        date: data.date,
        status: data.status,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots && effectiveSlots.length > 0 ? effectiveSlots : undefined,
        note: data.note,
        createdAt: String(oldFields[AVAIL_COL.createdAt] || nowIso),
        updatedAt: nowIso,
        updatedBy: actor.email,
      };
    } else {
      // CREATE new item
      actionType = "create";
      const createBody: Record<string, any> = {
        [AVAIL_COL.title]: compoundTitle,
        [AVAIL_COL.userId]: data.userId,
        [AVAIL_COL.userName]: data.userName,
        [AVAIL_COL.userEmail]: data.userEmail,
        [AVAIL_COL.department]: data.department || "",
        [AVAIL_COL.date]: data.date,
        [AVAIL_COL.status]: data.status,
        [AVAIL_COL.startTime]: effectiveStartTime,
        [AVAIL_COL.endTime]: effectiveEndTime,
        [AVAIL_COL.note]: data.note || "",
        [AVAIL_COL.createdBy]: actor.email,
        [AVAIL_COL.updatedBy]: actor.email,
        [AVAIL_COL.createdAt]: nowIso,
        [AVAIL_COL.updatedAt]: nowIso,
      };

      const res = await graphPost<{ id: string }>(listUrl, { fields: createBody });
      savedRecord = {
        id: String(res.id),
        ...data,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots && effectiveSlots.length > 0 ? effectiveSlots : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        updatedBy: actor.email,
      };
    }

    // Write audit log entry
    await recordAuditLog({
      availabilityId: savedRecord.id,
      userId: data.userId,
      date: data.date,
      action: actionType,
      changedBy: actor.email,
      changedAt: nowIso,
      oldValue: oldValueStr,
      newValue: JSON.stringify({
        status: data.status,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        slots: effectiveSlots,
        note: data.note,
      }),
      reason: overrideReason || (isOverride ? "Manager override" : undefined),
    });

    return { success: true, record: savedRecord };
  } catch (err: any) {
    if (isListNotFoundError(err)) {
      console.warn(`[saveAvailabilityEntry] TeamAvailability not found (${err?.message}), falling back to ActivityLog...`);
      return saveToActivityLogFallback(
        data,
        actor,
        effectiveStartTime,
        effectiveEndTime,
        effectiveSlots,
        isOverride,
        overrideReason
      );
    }
    console.error(`[saveAvailabilityEntry] Error: ${err.message}`);
    return { success: false, error: err.message || "Failed to save availability entry." };
  }
}

/**
 * Records an entry into the AvailabilityAudit SharePoint list, falling back to ActivityLog if missing.
 */
export async function recordAuditLog(entry: Omit<AvailabilityAudit, "id">): Promise<void> {
  const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
  try {
    const auditListUrl = await getSiteListUrlAsync("AvailabilityAudit");
    const fields = {
      [AUDIT_COL.title]: `${entry.userId}_${entry.date}_${entry.action}`,
      [AUDIT_COL.availabilityId]: entry.availabilityId || "",
      [AUDIT_COL.userId]: entry.userId,
      [AUDIT_COL.date]: entry.date,
      [AUDIT_COL.action]: entry.action,
      [AUDIT_COL.changedBy]: entry.changedBy,
      [AUDIT_COL.changedAt]: entry.changedAt || new Date().toISOString(),
      [AUDIT_COL.oldValue]: entry.oldValue || "",
      [AUDIT_COL.newValue]: entry.newValue || "",
      [AUDIT_COL.reason]: entry.reason || "",
    };
    await graphPost(auditListUrl, { fields });
    return;
  } catch (err: any) {
    if (!isListNotFoundError(err)) {
      console.warn(`[recordAuditLog] Warning: Could not write audit entry: ${err.message}`);
      return;
    }
  }

  // Fallback audit log to ActivityLog
  try {
    const activityListUrl = await getSiteListUrlAsync("ActivityLog");
    await graphPost(activityListUrl, {
      fields: {
        Title: `AVAIL_AUDIT_${entry.userId}_${entry.date}_${Date.now()}`,
        ActorId: entry.changedBy,
        ActorName: entry.changedBy,
        Action: `AVAIL_AUDIT_${entry.action}`,
        TargetId: entry.date,
        Description: JSON.stringify({
          availabilityId: entry.availabilityId,
          userId: entry.userId,
          date: entry.date,
          action: entry.action,
          changedBy: entry.changedBy,
          changedAt: entry.changedAt || new Date().toISOString(),
          reason: entry.reason,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        }),
      },
    });
  } catch (actErr: any) {
    console.warn(`[recordAuditLog] Fallback audit log to ActivityLog failed: ${actErr.message}`);
  }
}

/**
 * Handles a colleague's Change Request for locked or same-day dates.
 * Records into audit list and sends an email notification to management.
 */
export async function submitChangeRequest(params: {
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  requestedStatus: AvailabilityStatus;
  requestedTime?: string;
  reason: string;
  actor: { id: string; email: string; name: string };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    // 1. Audit log
    await recordAuditLog({
      userId: params.userId,
      date: params.date,
      action: "request_change",
      changedBy: params.actor.email,
      changedAt: nowIso,
      newValue: JSON.stringify({
        status: params.requestedStatus,
        time: params.requestedTime,
      }),
      reason: params.reason,
    });

    // 2. Email notification to management
    const { sendEmailViaGraph } = await import("./email");
    const subject = `[Availability Change Request] ${params.userName} for ${params.date}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0f172a;">Team Availability Change Request</h2>
        <p><strong>Colleague:</strong> ${params.userName} (${params.userEmail})</p>
        <p><strong>Target Date:</strong> ${params.date}</p>
        <p><strong>Requested Status:</strong> ${STATUS_LABELS[params.requestedStatus] || params.requestedStatus} ${
          params.requestedTime ? `(${params.requestedTime})` : ""
        }</p>
        <p><strong>Reason:</strong> ${params.reason}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 13px; color: #64748b;">
          This date was locked. As a manager, you can review and override this entry in the Team Availability console:
          <br /><a href="https://portal.mysccg.de/admin/availability" style="color: #2563eb;">Open Availability Console</a>
        </p>
      </div>
    `;

    for (const recipient of AVAILABILITY_CONFIG.managementEmails) {
      await sendEmailViaGraph({
        to: recipient,
        subject,
        htmlBody,
      }).catch((e) => console.warn(`Could not email manager ${recipient}: ${e.message}`));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit change request." };
  }
}

/**
 * Global hidden members for Team Availability.
 * Stored in Firestore (collection "system_settings", doc "team_availability")
 * with local fallback in "data/hidden-members.json".
 */
export async function getHiddenAvailabilityMemberIds(): Promise<string[]> {
  try {
    const { getAdminFirestore } = await import("./firebase-admin");
    const db = getAdminFirestore();
    const docSnap = await db.collection("system_settings").doc("team_availability").get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (Array.isArray(data?.hiddenMemberIds)) {
        return data.hiddenMemberIds;
      }
    }
  } catch (err: any) {
    console.warn("[getHiddenAvailabilityMemberIds] Firestore read warning:", err.message);
  }

  // Local file fallback
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "hidden-members.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // File not yet created
  }

  return [];
}

export async function setHiddenAvailabilityMemberIds(
  memberIds: string[],
  changedBy: string
): Promise<boolean> {
  const uniqueIds = Array.from(new Set(memberIds));

  // 1. Save to local fallback file
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const dirPath = path.join(process.cwd(), "data");
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(path.join(dirPath, "hidden-members.json"), JSON.stringify(uniqueIds), "utf-8");
  } catch (e: any) {
    console.warn("[setHiddenAvailabilityMemberIds] File write warning:", e.message);
  }

  // 2. Save to Firestore
  try {
    const { getAdminFirestore } = await import("./firebase-admin");
    const db = getAdminFirestore();
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("system_settings").doc("team_availability").set(
      {
        hiddenMemberIds: uniqueIds,
        updatedBy: changedBy,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.warn("[setHiddenAvailabilityMemberIds] Firestore write warning:", err.message);
    return true;
  }
}

