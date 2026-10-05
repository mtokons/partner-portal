import { AVAILABILITY_CONFIG, STATUS_LABELS } from "./availability-config";
import type { TeamAvailability, AvailabilityAudit, AvailabilityStatus, AvailabilityTimeSlot } from "@/types";

export interface AvailabilityUserItem {
  id: string;
  email: string;
  displayName?: string;
  company?: string;
  department?: string;
  roles?: string[];
}

// ============================================================
// 1. Timezone & Business Rules Utilities (Pure Functions)
// ============================================================

/**
 * Converts a Date or ISO string into Dhaka components (YYYY-MM-DD, dayOfWeek 0=Sun..6=Sat, hours, minutes).
 */
export function getDhakaParts(dateInput?: Date | string | number): {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hours: number;
  minutes: number;
} {
  const d = dateInput ? new Date(dateInput) : new Date();
  
  // Format with Intl.DateTimeFormat in Asia/Dhaka
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: AVAILABILITY_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let year = 0;
  let month = 0;
  let day = 0;
  let hours = 0;
  let minutes = 0;
  let weekdayStr = "";

  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    if (part.type === "month") month = parseInt(part.value, 10);
    if (part.type === "day") day = parseInt(part.value, 10);
    if (part.type === "hour") hours = parseInt(part.value, 10);
    if (part.type === "minute") minutes = parseInt(part.value, 10);
    if (part.type === "weekday") weekdayStr = part.value;
  }

  // Handle midnight/24 edge cases in some formatters
  if (hours === 24) hours = 0;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

  const mStr = String(month).padStart(2, "0");
  const dStr = String(day).padStart(2, "0");
  const dateStr = `${year}-${mStr}-${dStr}`;

  return { dateStr, year, month, day, dayOfWeek, hours, minutes };
}

/**
 * Returns today's YYYY-MM-DD in Asia/Dhaka.
 */
export function getDhakaToday(): string {
  return getDhakaParts().dateStr;
}

/**
 * Checks if a given dayOfWeek is configured as a weekend.
 */
export function isWeekendDay(dayOfWeek: number, weekendDays = AVAILABILITY_CONFIG.weekendDays): boolean {
  return weekendDays.includes(dayOfWeek);
}

/**
 * Checks if a specific YYYY-MM-DD date is a weekend.
 */
export function isDateWeekend(dateStr: string, weekendDays = AVAILABILITY_CONFIG.weekendDays): boolean {
  // Parse date safely at noon UTC to prevent offset issues
  const [y, m, d] = dateStr.split("-").map(Number);
  const tempDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = tempDate.getUTCDay();
  return isWeekendDay(dayOfWeek, weekendDays);
}

/**
 * Calculates date offset in days from a YYYY-MM-DD string.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes difference in calendar days (target - reference).
 */
export function daysDifference(targetDateStr: string, refDateStr: string): number {
  const [y1, m1, d1] = targetDateStr.split("-").map(Number);
  const [y2, m2, d2] = refDateStr.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

/**
 * Validates whether a colleague is permitted to create/edit an entry for targetDateStr.
 * Business Rules:
 * 1. Window: tomorrow (today + 1) to today + 7 days.
 * 2. Cut-off: entries close at 5:00 PM (17:00) the previous day.
 * 3. Weekends: Non-working days (Friday & Saturday).
 */
export function checkColleagueEditPermission(
  targetDateStr: string,
  nowDhakaInput?: Date | string | number
): { allowed: boolean; reason?: string } {
  const dhakaNow = getDhakaParts(nowDhakaInput);
  const todayStr = dhakaNow.dateStr;

  const diffDays = daysDifference(targetDateStr, todayStr);
  // Do not lock today or future days. Only lock dates before today
  if (diffDays < 0) {
    return {
      allowed: false,
      reason: "Past dates cannot be edited. Please submit a request if changes are needed.",
    };
  }

  if (diffDays > 60) {
    return {
      allowed: false,
      reason: "Entries can only be submitted up to 60 days in advance.",
    };
  }

  return { allowed: true };
}

/**
 * Helper to parse comma-separated start & end times into slots
 */
export function parseAvailabilitySlots(startTime?: string, endTime?: string): AvailabilityTimeSlot[] {
  if (!startTime || !endTime) return [];
  const startParts = startTime.split(",").map((s) => s.trim()).filter(Boolean);
  const endParts = endTime.split(",").map((s) => s.trim()).filter(Boolean);
  const slots: AvailabilityTimeSlot[] = [];
  const count = Math.min(startParts.length, endParts.length);
  for (let i = 0; i < count; i++) {
    slots.push({
      startTime: startParts[i],
      endTime: endParts[i],
    });
  }
  return slots;
}

/**
 * Calculates duration in hours between two HH:mm strings.
 */
export function calculateSlotHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
  const diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  return diffMinutes > 0 ? diffMinutes / 60 : 0;
}

/**
 * Calculates total hours for an array of slots or a single start/end time.
 */
export function calculateTotalHours(slots?: AvailabilityTimeSlot[], startTime?: string, endTime?: string): number {
  if (slots && slots.length > 0) {
    return slots.reduce((acc, slot) => acc + calculateSlotHours(slot.startTime, slot.endTime), 0);
  }
  if (startTime && endTime) {
    const parsed = parseAvailabilitySlots(startTime, endTime);
    if (parsed.length > 0) {
      return parsed.reduce((acc, slot) => acc + calculateSlotHours(slot.startTime, slot.endTime), 0);
    }
    return calculateSlotHours(startTime, endTime);
  }
  return 0;
}

/**
 * Formats hours into friendly display: e.g. "6 hrs" or "2h 30m" or "6h"
 */
export function formatFriendlyDuration(hours: number): string {
  if (hours <= 0) return "0 hrs";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} hr${h === 1 ? "" : "s"}`;
  if (h === 0) return `${m} mins`;
  return `${h}h ${m}m`;
}

/**
 * Formats time slots into readable string: e.g. "8:00 AM – 10:00 AM, 4:00 PM – 6:00 PM (4 hrs)"
 */
export function formatSlotsSummary(slots?: AvailabilityTimeSlot[], startTime?: string, endTime?: string): string {
  const effectiveSlots = (slots && slots.length > 0) ? slots : parseAvailabilitySlots(startTime, endTime);
  if (effectiveSlots.length > 0) {
    const formatted = effectiveSlots
      .map((s) => `${formatFriendlyTime(s.startTime)} – ${formatFriendlyTime(s.endTime)}`)
      .join(", ");
    const totalH = calculateTotalHours(effectiveSlots);
    return totalH > 0 ? `${formatted} (${formatFriendlyDuration(totalH)})` : formatted;
  }
  if (startTime && endTime) {
    return `${formatFriendlyTime(startTime)} – ${formatFriendlyTime(endTime)}`;
  }
  return "";
}

/**
 * Validates user availability form inputs (supporting multiple time slots).
 */
export function validateAvailabilityInput(input: {
  status?: string;
  startTime?: string;
  endTime?: string;
  slots?: AvailabilityTimeSlot[];
  note?: string;
}): { valid: boolean; error?: string } {
  const validStatuses: string[] = ["available", "indoor", "partial", "leave", "remote", "field"];
  if (!input.status || !validStatuses.includes(input.status)) {
    return { valid: false, error: "Please select a valid status (indoor, available, partial, leave, remote, field)." };
  }

  if (input.note && input.note.length > 200) {
    return { valid: false, error: "Note cannot exceed 200 characters." };
  }

  if (input.status !== "leave") {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    
    // Resolve slots
    let slotsToValidate: AvailabilityTimeSlot[] = [];
    if (input.slots && input.slots.length > 0) {
      slotsToValidate = input.slots;
    } else if (input.startTime && input.endTime) {
      slotsToValidate = parseAvailabilitySlots(input.startTime, input.endTime);
    }

    if (slotsToValidate.length === 0) {
      return { valid: false, error: "Please provide at least one time slot." };
    }

    for (let i = 0; i < slotsToValidate.length; i++) {
      const s = slotsToValidate[i];
      if (!timeRegex.test(s.startTime) || !timeRegex.test(s.endTime)) {
        return { valid: false, error: `Slot #${i + 1} (${s.startTime || "empty"} - ${s.endTime || "empty"}) must be in valid 24-hour HH:mm format.` };
      }

      const [startH, startM] = s.startTime.split(":").map(Number);
      const [endH, endM] = s.endTime.split(":").map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      if (endTotal <= startTotal) {
        return { valid: false, error: `Slot #${i + 1} end time (${s.endTime}) must be after start time (${s.startTime}).` };
      }
    }

    // Check for overlap among slots
    if (slotsToValidate.length > 1) {
      const sorted = [...slotsToValidate].sort((a, b) => {
        const [aH, aM] = a.startTime.split(":").map(Number);
        const [bH, bM] = b.startTime.split(":").map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        const [curEndH, curEndM] = cur.endTime.split(":").map(Number);
        const [nextStartH, nextStartM] = next.startTime.split(":").map(Number);
        if (nextStartH * 60 + nextStartM < curEndH * 60 + curEndM) {
          return {
            valid: false,
            error: `Time slots overlap: [${cur.startTime}–${cur.endTime}] overlaps with [${next.startTime}–${next.endTime}].`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Returns a 7-day week starting on Sunday for an anchor date.
 */
export function getWeekDaysForAnchor(anchorDateStr: string): Array<{
  dateStr: string;
  dayName: string;
  dayLabel: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isToday: boolean;
}> {
  const todayStr = getDhakaToday();
  const [y, m, d] = anchorDateStr.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const anchorDayOfWeek = anchor.getUTCDay(); // 0 = Sun

  // Sunday of this week:
  const sunday = new Date(anchor);
  sunday.setUTCDate(anchor.getUTCDate() - anchorDayOfWeek);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const week = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setUTCDate(sunday.getUTCDate() + i);
    const year = dayDate.getUTCFullYear();
    const month = String(dayDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dayDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = dayDate.getUTCDay();

    week.push({
      dateStr,
      dayName: dayNames[dayOfWeek],
      dayLabel: `${shortNames[dayOfWeek]} ${dayDate.getUTCDate()}`,
      dayOfWeek,
      isWeekend: isWeekendDay(dayOfWeek),
      isToday: dateStr === todayStr,
    });
  }

  return week;
}

/**
 * Formats time from 24h "14:00" to friendly "2 PM" or "2:30 PM".
 */
export function formatFriendlyTime(timeStr?: string): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${displayH}${displayM} ${ampm}`;
}

export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return "";
  return `${formatFriendlyTime(startTime)} to ${formatFriendlyTime(endTime)}`;
}

// ============================================================
// 2. Daily Report Metrics Calculation
// ============================================================

export interface DailyReportSummary {
  date: string;
  totalUsers: number;
  availableCount: number;
  partialCount: number;
  leaveCount: number;
  remoteFieldCount: number;
  notSubmittedCount: number;
  notFullyAvailableList: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    department: string;
    status: AvailabilityStatus;
    timeRange?: string;
    note?: string;
  }>;
  notSubmittedList: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    department: string;
  }>;
}

export function calculateDailyReport(
  dateStr: string,
  users: Array<{ id: string; email: string; displayName?: string; company?: string; department?: string; roles?: string[] }>,
  records: TeamAvailability[]
): DailyReportSummary {
  const recordsByUser = new Map<string, TeamAvailability>();
  for (const r of records) {
    if (r.date === dateStr) {
      recordsByUser.set(r.userId, r);
      if (r.userEmail) recordsByUser.set(r.userEmail.toLowerCase(), r);
    }
  }

  let availableCount = 0;
  let partialCount = 0;
  let leaveCount = 0;
  let remoteFieldCount = 0;
  let notSubmittedCount = 0;

  const notFullyAvailableList: DailyReportSummary["notFullyAvailableList"] = [];
  const notSubmittedList: DailyReportSummary["notSubmittedList"] = [];

  for (const user of users) {
    const entry = recordsByUser.get(user.id) || recordsByUser.get(user.email.toLowerCase());
    const department = user.department || user.company || "General";
    const userName = user.displayName || user.email.split("@")[0];

    if (!entry) {
      notSubmittedCount++;
      notSubmittedList.push({
        userId: user.id,
        userName,
        userEmail: user.email,
        department,
      });
      continue;
    }

    switch (entry.status) {
      case "available":
        availableCount++;
        break;
      case "partial":
        partialCount++;
        notFullyAvailableList.push({
          userId: user.id,
          userName: entry.userName || userName,
          userEmail: entry.userEmail || user.email,
          department: entry.department || department,
          status: "partial",
          timeRange: formatSlotsSummary(entry.slots, entry.startTime, entry.endTime),
          note: entry.note,
        });
        break;
      case "leave":
        leaveCount++;
        notFullyAvailableList.push({
          userId: user.id,
          userName: entry.userName || userName,
          userEmail: entry.userEmail || user.email,
          department: entry.department || department,
          status: "leave",
          note: entry.note,
        });
        break;
      case "remote":
      case "field":
        remoteFieldCount++;
        // If they have special notes or partial hours in field
        if (entry.note) {
          notFullyAvailableList.push({
            userId: user.id,
            userName: entry.userName || userName,
            userEmail: entry.userEmail || user.email,
            department: entry.department || department,
            status: entry.status,
            note: entry.note,
          });
        }
        break;
      default:
        notSubmittedCount++;
        notSubmittedList.push({
          userId: user.id,
          userName,
          userEmail: user.email,
          department,
        });
    }
  }

  return {
    date: dateStr,
    totalUsers: users.length,
    availableCount,
    partialCount,
    leaveCount,
    remoteFieldCount,
    notSubmittedCount,
    notFullyAvailableList,
    notSubmittedList,
  };
}
