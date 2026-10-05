/**
 * Configuration for Team Availability, Cutoffs, Weekends, and Reports.
 * All date & time logic is centered around the configured timezone (Asia/Dhaka).
 */

export const AVAILABILITY_CONFIG = {
  /** Timezone for all date computations, cut-offs, and report schedules */
  timezone: process.env.AVAILABILITY_TIMEZONE || "Asia/Dhaka",

  /**
   * Non-working weekend days (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday).
   * Default: Friday (5) and Saturday (6).
   */
  weekendDays: (process.env.AVAILABILITY_WEEKEND_DAYS || "5,6")
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => !isNaN(n)),

  /** Cut-off time for entering availability for a date (24-hour HH:mm) on the PREVIOUS day */
  cutOffTime: process.env.AVAILABILITY_CUTOFF_TIME || "17:00", // 5:00 PM

  /** Minimum days in advance colleagues can self-enter: 1 (tomorrow) */
  minDaysAhead: 1,

  /** Maximum days in advance colleagues can self-enter: 7 (today + 7 days) */
  maxDaysAhead: 7,

  /** Scheduled morning report run time (HH:mm in Asia/Dhaka) */
  morningReportTime: process.env.AVAILABILITY_REPORT_TIME || "08:30",

  /** Management recipients for the automated morning summary email */
  get managementEmails(): string[] {
    const raw = process.env.AVAILABILITY_REPORT_EMAILS || process.env.MANAGEMENT_EMAILS || "management@mysccg.de";
    return raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },

  /** Authorized roles for viewing manager reports, overriding entries, and sending reminders */
  managerRoles: ["admin", "super_admin", "sccg-admin", "hr", "school-manager", "project-admin"],

  /** Authorized management roles (can view report & calendar) */
  managementRoles: ["admin", "super_admin", "sccg-admin", "hr", "school-manager", "project-admin", "management"],
};

export const STATUS_LABELS: Record<string, string> = {
  indoor: "Indoor / Office",
  available: "Indoor / Office",
  partial: "Partial Hours",
  leave: "On leave",
  remote: "Remote",
  field: "Field",
};

export const STATUS_COLORS = {
  indoor: {
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-300 dark:border-emerald-700",
    pill: "bg-emerald-500 text-white",
  },
  available: {
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-300 dark:border-emerald-700",
    pill: "bg-emerald-500 text-white",
  },
  partial: {
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-300 dark:border-amber-700",
    pill: "bg-amber-500 text-white",
  },
  leave: {
    bg: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-800 dark:text-rose-200",
    border: "border-rose-300 dark:border-rose-700",
    pill: "bg-rose-500 text-white",
  },
  remote: {
    bg: "bg-sky-100 dark:bg-sky-950/60",
    text: "text-sky-800 dark:text-sky-200",
    border: "border-sky-300 dark:border-sky-700",
    pill: "bg-sky-500 text-white",
  },
  field: {
    bg: "bg-purple-100 dark:bg-purple-950/60",
    text: "text-purple-800 dark:text-purple-200",
    border: "border-purple-300 dark:border-purple-700",
    pill: "bg-purple-500 text-white",
  },
  unsubmitted: {
    bg: "bg-muted/40 dark:bg-muted/20",
    text: "text-muted-foreground",
    border: "border-dashed border-border dark:border-border/60",
    pill: "bg-muted text-muted-foreground",
  },
  weekend: {
    bg: "bg-muted/30 dark:bg-muted/10 opacity-60",
    text: "text-muted-foreground/70",
    border: "border-border/40",
    pill: "bg-muted/60 text-muted-foreground/60",
  },
};
