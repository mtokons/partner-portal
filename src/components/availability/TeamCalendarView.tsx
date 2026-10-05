"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Globe,
  Clock,
  Star,
  Edit3,
  Eye,
  EyeOff,
  Users,
  Search,
  X,
  Bell,
  FileSpreadsheet,
  Download,
  Printer,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportPastWeekReportToCsv } from "@/lib/availability-export";
import {
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/availability-config";
import type { TeamAvailability, AvailabilityStatus, AvailabilityTimeSlot } from "@/types";
import {
  getWeekDaysForAnchor,
  addDaysToDateStr,
  formatFriendlyTime,
  formatTimeRange,
  isDateWeekend,
  calculateSlotHours,
  calculateTotalHours,
  formatFriendlyDuration,
  parseAvailabilitySlots,
} from "@/lib/availability";

// ============================================================
// Bangladesh Public Holidays 2024-2027 (major national holidays)
// ============================================================
const BD_HOLIDAYS: Record<string, string> = {
  // 2024
  "2024-02-21": "Shaheed Dibosh (Language Martyrs' Day)",
  "2024-03-17": "Sheikh Mujibur Rahman's Birthday",
  "2024-03-26": "Independence Day",
  "2024-04-11": "Shab-e-Qadr",
  "2024-04-14": "Bengali New Year (Pohela Boishakh)",
  "2024-05-01": "May Day",
  "2024-05-22": "Buddha Purnima",
  "2024-06-17": "Eid ul-Adha",
  "2024-07-17": "Shab-e-Meraj",
  "2024-08-15": "National Mourning Day",
  "2024-08-26": "Janmashtami",
  "2024-09-17": "Eid-e-Milad-un-Nabi",
  "2024-11-01": "Shab-e-Barat",
  "2024-12-16": "Victory Day",
  "2024-12-25": "Christmas Day",
  // 2025
  "2025-02-21": "Shaheed Dibosh (Language Martyrs' Day)",
  "2025-03-14": "Shab-e-Barat",
  "2025-03-17": "Sheikh Mujibur Rahman's Birthday",
  "2025-03-26": "Independence Day",
  "2025-03-31": "Shab-e-Qadr",
  "2025-04-14": "Bengali New Year (Pohela Boishakh)",
  "2025-05-01": "May Day",
  "2025-05-12": "Buddha Purnima",
  "2025-06-07": "Eid ul-Adha",
  "2025-06-27": "Shab-e-Meraj",
  "2025-07-07": "Muharram (Ashura)",
  "2025-08-15": "National Mourning Day",
  "2025-08-16": "Janmashtami",
  "2025-09-05": "Eid-e-Milad-un-Nabi",
  "2025-10-02": "Durga Puja (Bijaya Dashami)",
  "2025-12-16": "Victory Day",
  "2025-12-25": "Christmas Day",
  // 2026
  "2026-01-27": "Shab-e-Meraj",
  "2026-02-21": "Shaheed Dibosh (Language Martyrs' Day)",
  "2026-03-03": "Shab-e-Barat",
  "2026-03-17": "Sheikh Mujibur Rahman's Birthday",
  "2026-03-20": "Shab-e-Qadr",
  "2026-03-22": "Lailat ul-Qadr",
  "2026-03-23": "Jumu'atul-Wida",
  "2026-03-26": "Independence Day",
  "2026-04-14": "Bengali New Year (Pohela Boishakh)",
  "2026-05-01": "May Day",
  "2026-05-27": "Eid ul-Adha",
  "2026-06-17": "Muharram (Ashura)",
  "2026-08-15": "National Mourning Day",
  "2026-08-26": "Eid-e-Milad-un-Nabi",
  "2026-10-21": "Durga Puja (Bijaya Dashami)",
  "2026-12-16": "Victory Day",
  "2026-12-25": "Christmas Day",
  // 2027
  "2027-01-16": "Shab-e-Meraj",
  "2027-02-19": "Shab-e-Barat",
  "2027-02-21": "Shaheed Dibosh (Language Martyrs' Day)",
  "2027-03-09": "Shab-e-Qadr",
  "2027-03-17": "Sheikh Mujibur Rahman's Birthday",
  "2027-03-26": "Independence Day",
  "2027-04-14": "Bengali New Year (Pohela Boishakh)",
  "2027-05-01": "May Day",
  "2027-05-17": "Eid ul-Adha",
  "2027-06-06": "Muharram (Ashura)",
  "2027-08-15": "National Mourning Day / Eid-e-Milad-un-Nabi",
  "2027-10-10": "Durga Puja (Bijaya Dashami)",
  "2027-12-16": "Victory Day",
  "2027-12-25": "Christmas Day",
};

// ============================================================
// Member Color Palette — Vibrant distinct colors for each member
// ============================================================
const MEMBER_COLORS = [
  { bg: "bg-blue-500",    light: "bg-blue-100 dark:bg-blue-950/70",    text: "text-blue-700 dark:text-blue-300",    border: "border-blue-300 dark:border-blue-700",    accent: "#3b82f6" },
  { bg: "bg-violet-500",  light: "bg-violet-100 dark:bg-violet-950/70",  text: "text-violet-700 dark:text-violet-300",  border: "border-violet-300 dark:border-violet-700",  accent: "#8b5cf6" },
  { bg: "bg-emerald-500", light: "bg-emerald-100 dark:bg-emerald-950/70", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700", accent: "#10b981" },
  { bg: "bg-rose-500",    light: "bg-rose-100 dark:bg-rose-950/70",    text: "text-rose-700 dark:text-rose-300",    border: "border-rose-300 dark:border-rose-700",    accent: "#f43f5e" },
  { bg: "bg-amber-500",   light: "bg-amber-100 dark:bg-amber-950/70",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-300 dark:border-amber-700",   accent: "#f59e0b" },
  { bg: "bg-cyan-500",    light: "bg-cyan-100 dark:bg-cyan-950/70",    text: "text-cyan-700 dark:text-cyan-300",    border: "border-cyan-300 dark:border-cyan-700",    accent: "#06b6d4" },
  { bg: "bg-fuchsia-500", light: "bg-fuchsia-100 dark:bg-fuchsia-950/70", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-300 dark:border-fuchsia-700", accent: "#d946ef" },
  { bg: "bg-orange-500",  light: "bg-orange-100 dark:bg-orange-950/70",  text: "text-orange-700 dark:text-orange-300",  border: "border-orange-300 dark:border-orange-700",  accent: "#f97316" },
  { bg: "bg-teal-500",    light: "bg-teal-100 dark:bg-teal-950/70",    text: "text-teal-700 dark:text-teal-300",    border: "border-teal-300 dark:border-teal-700",    accent: "#14b8a6" },
  { bg: "bg-indigo-500",  light: "bg-indigo-100 dark:bg-indigo-950/70",  text: "text-indigo-700 dark:text-indigo-300",  border: "border-indigo-300 dark:border-indigo-700",  accent: "#6366f1" },
  { bg: "bg-lime-500",    light: "bg-lime-100 dark:bg-lime-950/70",    text: "text-lime-700 dark:text-lime-300",    border: "border-lime-300 dark:border-lime-700",    accent: "#84cc16" },
  { bg: "bg-pink-500",    light: "bg-pink-100 dark:bg-pink-950/70",    text: "text-pink-700 dark:text-pink-300",    border: "border-pink-300 dark:border-pink-700",    accent: "#ec4899" },
];

// ============================================================
// Timezone & Sunset Utilities
// ============================================================

/** Approximate sunset times (hour in 24h) for Dhaka by month */
const SUNSET_DHAKA: Record<number, number> = {
  1: 17, 2: 18, 3: 18, 4: 18, 5: 18, 6: 19, 7: 19, 8: 18, 9: 18, 10: 17, 11: 17, 12: 17,
};
/** Approximate sunset times (hour in 24h) for Germany by month */
const SUNSET_GERMANY: Record<number, number> = {
  1: 16, 2: 17, 3: 18, 4: 20, 5: 21, 6: 21, 7: 21, 8: 20, 9: 19, 10: 18, 11: 16, 12: 16,
};

/** Convert 24h time string "HH:mm" to German time (Europe/Berlin) equivalent.
 *  Bangladesh (UTC+6) → Germany CET (UTC+1) = -5h, CEST (UTC+2) = -4h.
 *  We'll use Intl for proper DST handling. */
function convertBdToGerman(timeStr: string, dateStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  // Create a Date in BD time (UTC+6)
  const utcMs = Date.UTC(y, mo - 1, d, h - 6, m);
  const dt = new Date(utcMs);
  const formatted = dt.toLocaleTimeString("en-US", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatted;
}

/** Convert 24h time string to Bangladesh 12h format */
function toBd12h(timeStr: string): string {
  if (!timeStr) return "";
  return formatFriendlyTime(timeStr);
}

/** Check if a given hour (24h) is after sunset for a given month and timezone */
function isAfterSunset(hour24: number, month: number, tz: "bd" | "de"): boolean {
  const sunsetMap = tz === "bd" ? SUNSET_DHAKA : SUNSET_GERMANY;
  return hour24 >= (sunsetMap[month] ?? 18);
}

// ============================================================
// Interfaces
// ============================================================

interface ColleagueItem {
  id: string;
  email: string;
  displayName: string;
  department: string;
  roles?: string[];
}

interface TeamCalendarViewProps {
  currentWeekAnchor: string;
  onWeekChange: (newAnchorDate: string) => void;
  records: TeamAvailability[];
  colleagues: ColleagueItem[];
  currentUserId?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  isManager: boolean;
  isAdmin?: boolean;
  initialHiddenMemberIds?: string[];
  onSelectCell?: (params: {
    colleague: ColleagueItem;
    dateStr: string;
    existingRecord?: TeamAvailability;
  }) => void;
  onOpenMyEntry?: (dateStr?: string) => void;
}

// ============================================================
// Main Component
// ============================================================

export function TeamCalendarView({
  currentWeekAnchor,
  onWeekChange,
  records,
  colleagues,
  currentUserId,
  currentUserEmail,
  currentUserName,
  isManager,
  isAdmin = false,
  initialHiddenMemberIds = [],
  onSelectCell,
  onOpenMyEntry,
}: TeamCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
    return formatter.format(now);
  });

  // Week days
  const weekDays = useMemo(() => {
    return getWeekDaysForAnchor(currentWeekAnchor);
  }, [currentWeekAnchor]);

  // Working days only (exclude weekends: Friday & Saturday)
  const workingDays = useMemo(() => {
    return weekDays.filter((d) => !d.isWeekend);
  }, [weekDays]);

  // Quick lookup map
  const recordsMap = useMemo(() => {
    const map = new Map<string, TeamAvailability>();
    records.forEach((r) => {
      map.set(`${r.userId}_${r.date}`, r);
      if (r.userEmail) map.set(`${r.userEmail.toLowerCase()}_${r.date}`, r);
    });
    return map;
  }, [records]);

  // Member color assignments (deterministic by index)
  const memberColors = useMemo(() => {
    const map = new Map<string, typeof MEMBER_COLORS[0]>();
    colleagues.forEach((c, i) => {
      map.set(c.id, MEMBER_COLORS[i % MEMBER_COLORS.length]);
    });
    return map;
  }, [colleagues]);

  // Hidden Member IDs (loaded from server + persisted globally by admin)
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>(initialHiddenMemberIds);

  React.useEffect(() => {
    if (initialHiddenMemberIds && initialHiddenMemberIds.length > 0) {
      setHiddenMemberIds(initialHiddenMemberIds);
    }
  }, [initialHiddenMemberIds]);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  // Modals for Admin Actions
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [showPastWeekModal, setShowPastWeekModal] = useState(false);

  // Toggle member visibility — ONLY allowed for admin, persists globally
  const toggleMemberVisibility = useCallback(async (id: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can modify member visibility.");
      return;
    }
    const isNowHidden = hiddenMemberIds.includes(id);
    const next = isNowHidden ? hiddenMemberIds.filter((item) => item !== id) : [...hiddenMemberIds, id];
    setHiddenMemberIds(next);

    try {
      const res = await fetch("/api/availability/hidden-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, hide: !isNowHidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member visibility on server");
      toast.success(isNowHidden ? "Member restored to team view for all users." : "Member hidden globally for all users.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update member visibility on server.");
    }
  }, [isAdmin, hiddenMemberIds]);

  const showAllMembers = useCallback(async () => {
    if (!isAdmin) return;
    setHiddenMemberIds([]);
    try {
      const res = await fetch("/api/availability/hidden-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenMemberIds: [] }),
      });
      if (res.ok) {
        toast.success("All members are now visible globally for all users.");
      }
    } catch {
      toast.error("Failed to update visibility on server.");
    }
  }, [isAdmin]);

  const hideAllMembers = useCallback(async () => {
    if (!isAdmin) return;
    const allIds = colleagues.map((c) => c.id);
    setHiddenMemberIds(allIds);
    try {
      const res = await fetch("/api/availability/hidden-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenMemberIds: allIds }),
      });
      if (res.ok) {
        toast.success("All members hidden globally.");
      }
    } catch {
      toast.error("Failed to update visibility on server.");
    }
  }, [isAdmin, colleagues]);

  // Filtered visible colleagues for both Daily and Weekly views
  const visibleColleagues = useMemo(() => {
    return colleagues.filter((c) => !hiddenMemberIds.includes(c.id));
  }, [colleagues, hiddenMemberIds]);

  // Missing colleagues for selected date (for Reminder button)
  const missingColleaguesForSelectedDate = useMemo(() => {
    return visibleColleagues.filter((c) => {
      const rec = recordsMap.get(`${c.id}_${selectedDate}`) ||
        (c.email ? recordsMap.get(`${c.email.toLowerCase()}_${selectedDate}`) : undefined);
      return !rec;
    });
  }, [visibleColleagues, selectedDate, recordsMap]);

  // Past week days for past week report
  const pastWeekDays = useMemo(() => {
    const prevAnchor = addDaysToDateStr(currentWeekAnchor, -7);
    return getWeekDaysForAnchor(prevAnchor);
  }, [currentWeekAnchor]);

  // Send reminders handler
  const handleSendReminders = async () => {
    try {
      setReminderSending(true);
      const res = await fetch("/api/availability/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: selectedDate,
          recipients: missingColleaguesForSelectedDate.map((c) => ({
            email: c.email,
            name: c.displayName,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch reminders");
      toast.success(data.message || `Dispatched reminders to ${missingColleaguesForSelectedDate.length} colleague(s) via Email and Teams.`);
      setShowReminderModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminders");
    } finally {
      setReminderSending(false);
    }
  };

  // Export past week CSV handler
  const handleExportPastWeekCsv = () => {
    exportPastWeekReportToCsv(pastWeekDays, visibleColleagues, records);
    toast.success("Past week availability report exported successfully.");
  };

  // Selected day info for daily view
  const selectedDayInfo = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return {
      dayName: dayNames[dt.getUTCDay()],
      monthName: monthNames[m - 1],
      day: d,
      year: y,
      month: m,
      isWeekend: isDateWeekend(selectedDate),
      holiday: BD_HOLIDAYS[selectedDate] || null,
    };
  }, [selectedDate]);

  // Week label
  const weekLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const sun = weekDays[0];
    const sat = weekDays[6];
    const [y1, m1, d1] = sun.dateStr.split("-").map(Number);
    const [y2, m2, d2] = sat.dateStr.split("-").map(Number);
    const dt1 = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
    const dt2 = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
    const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${fmt(dt1)} — ${fmt(dt2)}, ${y1}`;
  }, [weekDays]);

  // Check if any day in the current week has a BD holiday
  const weekHolidays = useMemo(() => {
    const holidays: Array<{ dateStr: string; name: string; dayLabel: string }> = [];
    for (const d of weekDays) {
      const h = BD_HOLIDAYS[d.dateStr];
      if (h) holidays.push({ dateStr: d.dateStr, name: h, dayLabel: d.dayLabel });
    }
    return holidays;
  }, [weekDays]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Team Calendar
            </h2>
            <p className="text-blue-100 text-xs mt-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Showing times in both Bangladesh (BST) and Germany (CET/CEST)
            </p>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter / Visibility Button: Admin Only */}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFilterModal(true)}
                className={`text-xs h-8 gap-1.5 font-semibold border transition ${
                  hiddenMemberIds.length > 0
                    ? "bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-500 shadow-sm"
                    : "bg-white/15 text-white hover:bg-white/25 border-white/20"
                }`}
                title="Hide or show members globally for all users (Admin only)"
              >
                {hiddenMemberIds.length > 0 ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>Members ({visibleColleagues.length}/{colleagues.length})</span>
              </Button>
            )}

            {/* Past Week Report Button: Admin / Manager */}
            {(isAdmin || isManager) && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowPastWeekModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm text-xs h-8 gap-1.5 border-0 transition"
                title="Generate and export report of all member past week entries"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Past Week Report</span>
              </Button>
            )}

            {/* Reminder Button: Admin / Manager */}
            {(isAdmin || isManager) && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowReminderModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm text-xs h-8 gap-1.5 border-0 transition"
                title="Send notification via Microsoft Teams and Email to employees who missed submitting"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Remind Missing ({missingColleaguesForSelectedDate.length})</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => onOpenMyEntry?.(selectedDate)}
              className="bg-white text-indigo-700 hover:bg-blue-50 font-bold shadow-sm text-xs h-8 gap-1.5 border-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Enter / Update My Time
            </Button>

            {/* Tab Switcher */}
            <div className="flex items-center bg-white/15 backdrop-blur rounded-lg p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "daily"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                Daily View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("weekly")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "weekly"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                Weekly View
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Hidden Members Notice Banner — Admin Only */}
        {isAdmin && hiddenMemberIds.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{hiddenMemberIds.length}</strong> team member{hiddenMemberIds.length > 1 ? "s are" : " is"} currently hidden globally from all users.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={showAllMembers}
                className="font-bold underline hover:no-underline text-amber-800 dark:text-amber-300"
              >
                Show All
              </button>
              <span className="text-amber-300 dark:text-amber-700">•</span>
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="font-medium underline hover:no-underline text-amber-800 dark:text-amber-300"
              >
                Manage Visibility
              </button>
            </div>
          </div>
        )}

        {viewMode === "daily" ? (
          <DailyView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedDayInfo={selectedDayInfo}
            colleagues={visibleColleagues}
            recordsMap={recordsMap}
            memberColors={memberColors}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            isManager={isManager}
            onSelectCell={onSelectCell}
            onToggleHideMember={isAdmin ? toggleMemberVisibility : undefined}
            onShowAllMembers={showAllMembers}
          />
        ) : (
          <WeeklyView
            weekDays={weekDays}
            workingDays={workingDays}
            weekLabel={weekLabel}
            weekHolidays={weekHolidays}
            currentWeekAnchor={currentWeekAnchor}
            onWeekChange={onWeekChange}
            colleagues={visibleColleagues}
            recordsMap={recordsMap}
            memberColors={memberColors}
            isManager={isManager}
            onSelectCell={onSelectCell}
          />
        )}

        {/* Legend Row */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Status:</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            🏢 Indoor / Office
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-xs font-medium">
            ☁ Remote
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-medium">
            ⚑ Field
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-medium">
            ◑ Partial
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-xs font-medium">
            ✗ On leave
          </span>
          <span className="ml-4 inline-flex items-center gap-1 text-xs text-slate-400">
            <Moon className="w-3 h-3" /> = After sunset (darker BG)
          </span>
        </div>

        {/* Member Color Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Members:
          </span>
          {colleagues.map((c) => {
            const color = memberColors.get(c.id);
            const isHidden = hiddenMemberIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => isAdmin && toggleMemberVisibility(c.id)}
                disabled={!isAdmin}
                title={isAdmin ? (isHidden ? `Click to show ${c.displayName} for all` : `Click to hide ${c.displayName} for all`) : c.displayName}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  isAdmin ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : "cursor-default"
                } ${
                  isHidden
                    ? "bg-slate-100 dark:bg-slate-800/40 text-slate-400 line-through opacity-60"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isHidden ? "#94a3b8" : (color?.accent || "#6366f1") }}
                />
                <span>{c.displayName?.split(" ")[0] || c.email.split("@")[0]}</span>
                {isAdmin && isHidden && <EyeOff className="w-3 h-3 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* MEMBER VISIBILITY FILTER MODAL */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Filter Team Members
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose which members to show or hide in the view and report.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {visibleColleagues.length} of {colleagues.length} visible
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={showAllMembers}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40"
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={hideAllMembers}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-700 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
                  >
                    Hide All
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Member list with checkboxes & eye toggles */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {colleagues
                .filter((c) =>
                  !filterSearch ||
                  c.displayName.toLowerCase().includes(filterSearch.toLowerCase()) ||
                  c.email.toLowerCase().includes(filterSearch.toLowerCase())
                )
                .map((c) => {
                  const isVisible = !hiddenMemberIds.includes(c.id);
                  const color = memberColors.get(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleMemberVisibility(c.id)}
                      className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color?.accent || "#6366f1" }}
                        />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold truncate ${isVisible ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through"}`}>
                            {c.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {c.department || "SCCG Team"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isVisible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <Eye className="w-3 h-3" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                onClick={() => setShowFilterModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REMINDER MODAL (ADMIN / MANAGER) */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Send Availability Reminders
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notify missing team members via Email and Microsoft Teams
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-200 mb-1">
                  <span>Target Date: <strong>{selectedDate}</strong></span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {missingColleaguesForSelectedDate.length} Colleague(s) Missing
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                    ✉️ Graph Email (portal@mysccg.de)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                    💬 Microsoft Teams Direct Chat
                  </span>
                </div>
              </div>

              {missingColleaguesForSelectedDate.length === 0 ? (
                <div className="p-6 text-center text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  ✓ All visible colleagues have submitted their availability for this date!
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                  {missingColleaguesForSelectedDate.map((c) => (
                    <div key={c.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{c.displayName}</div>
                        <div className="text-[11px] text-slate-400">{c.email} • {c.department}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-full">
                        Not Submitted
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReminderModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={reminderSending || missingColleaguesForSelectedDate.length === 0}
                onClick={handleSendReminders}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-bold"
              >
                {reminderSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending Reminders...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Email & Teams Notifications ({missingColleaguesForSelectedDate.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PAST WEEK REPORT MODAL (ADMIN / MANAGER) */}
      {showPastWeekModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Past Week Team Availability Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Period: {pastWeekDays[0]?.dateStr} to {pastWeekDays[pastWeekDays.length - 1]?.dateStr}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportPastWeekCsv}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPastWeekModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Table Content */}
            <div className="flex-1 overflow-auto my-4 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Colleague</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Dept</th>
                    {pastWeekDays.map((d) => (
                      <th key={d.dateStr} className={`py-2.5 px-2 font-semibold text-center ${d.isWeekend ? "text-slate-400 opacity-60" : "text-slate-700 dark:text-slate-300"}`}>
                        <div>{d.dayLabel}</div>
                        <div className="text-[10px] font-normal text-slate-400">{d.dateStr.slice(5)}</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-bold text-center text-slate-700 dark:text-slate-300">Submitted</th>
                    <th className="py-2.5 px-3 font-bold text-center text-slate-700 dark:text-slate-300">Logged Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleColleagues.map((c) => {
                    let subCount = 0;
                    let totalMins = 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {c.displayName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {c.department || "SCCG"}
                        </td>
                        {pastWeekDays.map((d) => {
                          const rec = records.find(
                            (r) =>
                              r.date === d.dateStr &&
                              (r.userId === c.id || (r.userEmail && r.userEmail.toLowerCase() === c.email.toLowerCase()))
                          );
                          if (rec) {
                            subCount++;
                            if (rec.startTime && rec.endTime) {
                              const [sH, sM] = rec.startTime.split(":").map(Number);
                              const [eH, eM] = rec.endTime.split(":").map(Number);
                              if (!isNaN(sH) && !isNaN(eH)) {
                                const diff = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
                                if (diff > 0) totalMins += diff;
                              }
                            }
                            return (
                              <td key={d.dateStr} className="py-2 px-1 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  rec.status === "indoor" || rec.status === "available"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : rec.status === "partial"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    : rec.status === "leave"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                                }`}>
                                  {rec.status === "leave" ? "Leave" : rec.startTime ? `${rec.startTime.slice(0,5)}` : (STATUS_LABELS[rec.status] || rec.status)}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={d.dateStr} className="py-2 px-1 text-center">
                              {d.isWeekend ? (
                                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">Off</span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                  Missing
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {subCount} / {pastWeekDays.filter(d => !d.isWeekend).length}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {(totalMins / 60).toFixed(1)} hrs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 shrink-0">
              <span>Showing {visibleColleagues.length} team members</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPastWeekModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DAILY VIEW SUB-COMPONENT
// ============================================================

interface DailyViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedDayInfo: {
    dayName: string;
    monthName: string;
    day: number;
    year: number;
    month: number;
    isWeekend: boolean;
    holiday: string | null;
  };
  colleagues: ColleagueItem[];
  recordsMap: Map<string, TeamAvailability>;
  memberColors: Map<string, typeof MEMBER_COLORS[0]>;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager: boolean;
  onSelectCell?: (params: { colleague: ColleagueItem; dateStr: string; existingRecord?: TeamAvailability }) => void;
  onToggleHideMember?: (id: string) => void;
  onShowAllMembers?: () => void;
}

function DailyView({
  selectedDate,
  onDateChange,
  selectedDayInfo,
  colleagues,
  recordsMap,
  memberColors,
  currentUserId,
  currentUserEmail,
  isManager,
  onSelectCell,
  onToggleHideMember,
  onShowAllMembers,
}: DailyViewProps) {
  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onDateChange(addDaysToDateStr(selectedDate, -1))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center min-w-[180px]">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {selectedDayInfo.dayName}, {selectedDayInfo.monthName} {selectedDayInfo.day}
            </div>
            <div className="text-xs text-slate-500">{selectedDayInfo.year}</div>
          </div>

          <button
            type="button"
            onClick={() => onDateChange(addDaysToDateStr(selectedDate, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Weekend / Holiday Banner */}
      {selectedDayInfo.isWeekend && (
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            🏖️ Weekend — Non-working day
          </p>
        </div>
      )}
      {selectedDayInfo.holiday && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <Star className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              🇧🇩 Bangladesh Public Holiday
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">{selectedDayInfo.holiday}</p>
          </div>
        </div>
      )}

      {/* Timezone Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center text-lg">
            🇧🇩
          </div>
          <div>
            <p className="text-xs font-bold text-green-800 dark:text-green-300">Bangladesh Time</p>
            <p className="text-xs text-green-600 dark:text-green-400">BST (UTC+6)</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-lg">
            🇩🇪
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300">German Time</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">CET/CEST</p>
          </div>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-3">
        {colleagues.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 italic space-y-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <div>All team members are currently hidden from this view.</div>
            {onShowAllMembers && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowAllMembers}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Show All Members
                </Button>
              </div>
            )}
          </div>
        ) : (
          colleagues.map((colleague) => {
            const record =
              recordsMap.get(`${colleague.id}_${selectedDate}`) ||
              recordsMap.get(`${colleague.email.toLowerCase()}_${selectedDate}`);
            const color = memberColors.get(colleague.id) || MEMBER_COLORS[0];

            // Determine slots & start/end times to display
            const effectiveSlots: AvailabilityTimeSlot[] =
              record?.slots && record.slots.length > 0
                ? record.slots
                : parseAvailabilitySlots(record?.startTime, record?.endTime);
            const totalHours = calculateTotalHours(effectiveSlots, record?.startTime, record?.endTime);
            const lastSlot = effectiveSlots[effectiveSlots.length - 1];
            const endHour = parseInt((lastSlot?.endTime || record?.endTime || "17:00").split(":")[0], 10);
            const bdAfterSunset = isAfterSunset(endHour, selectedDayInfo.month, "bd");

            // Status visual
            const statusInfo = getStatusVisual(record?.status);

            return (
              <div
                key={colleague.id}
                className={`rounded-xl border overflow-hidden transition-all hover:shadow-md ${color.border} ${
                  bdAfterSunset ? "bg-slate-800/5 dark:bg-slate-950/60" : "bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Member Identity Bar */}
                  <div
                    className="w-full lg:w-56 shrink-0 p-4 flex items-center gap-3"
                    style={{ borderLeft: `4px solid ${color.accent}` }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: color.accent }}
                    >
                      {(colleague.displayName || colleague.email)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {colleague.displayName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {colleague.department || "SCCG Team"}
                      </div>
                    </div>
                  </div>

                  {/* Availability Info */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Status Badge */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.classes}`}
                      >
                        <span>{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Time Blocks (Multiple Slots) */}
                    {record && record.status !== "leave" && (
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            ⏱️ Total Work: {formatFriendlyDuration(totalHours)}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {effectiveSlots.length} {effectiveSlots.length === 1 ? "time slot" : "time slots"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {effectiveSlots.map((slot, sIdx) => {
                            const slotH = calculateSlotHours(slot.startTime, slot.endTime);
                            const bdStartDisp = toBd12h(slot.startTime);
                            const bdEndDisp = toBd12h(slot.endTime);
                            const deStartDisp = convertBdToGerman(slot.startTime, selectedDate);
                            const deEndDisp = convertBdToGerman(slot.endTime, selectedDate);
                            const sEndH = parseInt(slot.endTime.split(":")[0], 10);
                            const sBdNight = isAfterSunset(sEndH, selectedDayInfo.month, "bd");
                            const sDeNight = isAfterSunset(Math.max(0, sEndH - 5), selectedDayInfo.month, "de");

                            return (
                              <div
                                key={sIdx}
                                className={`rounded-xl p-2.5 border transition ${
                                  sBdNight
                                    ? "bg-slate-800/10 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700"
                                    : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] flex items-center justify-center font-bold">
                                      {sIdx + 1}
                                    </span>
                                    {slot.label || `Slot ${sIdx + 1}`}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    {formatFriendlyDuration(slotH)}
                                  </span>
                                </div>

                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <span>🇧🇩</span> {bdStartDisp} – {bdEndDisp}
                                  {sBdNight && <Moon className="w-3 h-3 text-indigo-400 inline" />}
                                </div>

                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                                  <span>🇩🇪</span> {deStartDisp} – {deEndDisp}
                                  {sDeNight && <Moon className="w-2.5 h-2.5 text-indigo-400 inline" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    {record?.note && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-xs">
                        &quot;{record.note}&quot;
                      </div>
                    )}

                    {/* No submission */}
                    {!record && (
                      <div className="text-xs text-slate-400 italic">Not submitted yet</div>
                    )}
                  </div>

                  {/* Action Buttons: Hide & Edit */}
                  <div className="p-4 flex items-center gap-1.5">
                    {onToggleHideMember && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleHideMember(colleague.id)}
                        className="h-8 text-xs gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Hide member from view and report"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hide</span>
                      </Button>
                    )}

                    {/* Edit Button: allowed for self OR manager */}
                    {(isManager || colleague.id === currentUserId || (currentUserEmail && colleague.email?.toLowerCase() === currentUserEmail.toLowerCase())) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onSelectCell?.({
                            colleague,
                            dateStr: selectedDate,
                            existingRecord: record,
                          })
                        }
                        className="h-8 text-xs gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// WEEKLY VIEW SUB-COMPONENT
// ============================================================

interface WeeklyViewProps {
  weekDays: Array<{
    dateStr: string;
    dayName: string;
    dayLabel: string;
    dayOfWeek: number;
    isWeekend: boolean;
    isToday: boolean;
  }>;
  workingDays: Array<{
    dateStr: string;
    dayName: string;
    dayLabel: string;
    dayOfWeek: number;
    isWeekend: boolean;
    isToday: boolean;
  }>;
  weekLabel: string;
  weekHolidays: Array<{ dateStr: string; name: string; dayLabel: string }>;
  currentWeekAnchor: string;
  onWeekChange: (date: string) => void;
  colleagues: ColleagueItem[];
  recordsMap: Map<string, TeamAvailability>;
  memberColors: Map<string, typeof MEMBER_COLORS[0]>;
  isManager: boolean;
  onSelectCell?: (params: { colleague: ColleagueItem; dateStr: string; existingRecord?: TeamAvailability }) => void;
}

function WeeklyView({
  weekDays,
  workingDays,
  weekLabel,
  weekHolidays,
  currentWeekAnchor,
  onWeekChange,
  colleagues,
  recordsMap,
  memberColors,
  isManager,
  onSelectCell,
}: WeeklyViewProps) {
  // Show all 7 days including weekends
  const displayDays = weekDays;

  return (
    <div className="space-y-5">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onWeekChange(addDaysToDateStr(currentWeekAnchor, -7))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[200px] text-center">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => onWeekChange(addDaysToDateStr(currentWeekAnchor, 7))}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* TZ Indicator */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">🇧🇩 BST</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="flex items-center gap-1">🇩🇪 CET</span>
        </div>
      </div>

      {/* Holidays for this week */}
      {weekHolidays.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {weekHolidays.map((h) => (
            <div
              key={h.dateStr}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs"
            >
              <Star className="w-3 h-3 text-red-500" />
              <span className="font-semibold text-red-700 dark:text-red-300">{h.dayLabel}</span>
              <span className="text-red-600 dark:text-red-400">— {h.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Weekly Grid */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-48 text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team Member
              </th>
              {displayDays.map((d) => {
                const holiday = BD_HOLIDAYS[d.dateStr];
                return (
                  <th
                    key={d.dateStr}
                    className={`text-center py-2 px-1 text-xs font-semibold rounded-lg ${
                      d.isToday
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-300 dark:ring-blue-700"
                        : d.isWeekend
                        ? "text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div>{d.dayLabel}</div>
                    {holiday && (
                      <div className="text-[9px] text-red-500 dark:text-red-400 mt-0.5 font-normal truncate max-w-[100px] mx-auto" title={holiday}>
                        🇧🇩 {holiday.split("(")[0].trim()}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {colleagues.length === 0 ? (
              <tr>
                <td colSpan={displayDays.length + 1} className="py-8 text-center text-sm text-slate-400 italic">
                  No team members found.
                </td>
              </tr>
            ) : (
              colleagues.map((colleague) => {
                const color = memberColors.get(colleague.id) || MEMBER_COLORS[0];
                return (
                  <tr key={colleague.id}>
                    {/* Member Name */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color.accent }}
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {colleague.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {colleague.department || "SCCG Team"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Columns */}
                    {displayDays.map((day) => {
                      const record =
                        recordsMap.get(`${colleague.id}_${day.dateStr}`) ||
                        recordsMap.get(`${colleague.email.toLowerCase()}_${day.dateStr}`);

                      return (
                        <td key={day.dateStr} className="p-0.5">
                          <WeeklyCellBlock
                            colleague={colleague}
                            day={day}
                            record={record}
                            color={color}
                            isManager={isManager}
                            onClick={() =>
                              onSelectCell?.({
                                colleague,
                                dateStr: day.dateStr,
                                existingRecord: record,
                              })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Weekly View */}
      <div className="block md:hidden space-y-4">
        {colleagues.map((colleague) => {
          const color = memberColors.get(colleague.id) || MEMBER_COLORS[0];
          return (
            <div
              key={colleague.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: color.accent + "40" }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderLeft: `4px solid ${color.accent}` }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: color.accent }}
                >
                  {(colleague.displayName || colleague.email)[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{colleague.displayName}</div>
                  <div className="text-[10px] text-slate-400">{colleague.department || "SCCG Team"}</div>
                </div>
              </div>
              <div className="px-4 pb-3 grid grid-cols-1 gap-1.5">
                {displayDays.map((day) => {
                  const record =
                    recordsMap.get(`${colleague.id}_${day.dateStr}`) ||
                    recordsMap.get(`${colleague.email.toLowerCase()}_${day.dateStr}`);
                  const statusInfo = getStatusVisual(record?.status);

                  const effectiveSlots = (record?.slots && record.slots.length > 0)
                    ? record.slots
                    : parseAvailabilitySlots(record?.startTime, record?.endTime);
                  const totalH = calculateTotalHours(effectiveSlots, record?.startTime, record?.endTime);

                  let timeDisplay = "";
                  if (record?.status === "leave") {
                    timeDisplay = "—";
                  } else if (effectiveSlots.length > 1) {
                    timeDisplay = `${effectiveSlots.map(s => `${toBd12h(s.startTime)}–${toBd12h(s.endTime)}`).join(", ")} (${formatFriendlyDuration(totalH)})`;
                  } else if (effectiveSlots.length === 1) {
                    timeDisplay = `🇧🇩 ${toBd12h(effectiveSlots[0].startTime)}–${toBd12h(effectiveSlots[0].endTime)} | 🇩🇪 ${convertBdToGerman(effectiveSlots[0].startTime, day.dateStr)}–${convertBdToGerman(effectiveSlots[0].endTime, day.dateStr)}`;
                  } else if (record) {
                    timeDisplay = "9:00 AM–5:00 PM";
                  }

                  return (
                    <div
                      key={day.dateStr}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${
                        day.isWeekend
                          ? "bg-slate-50 dark:bg-slate-800/30 opacity-60"
                          : day.isToday
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : "bg-white dark:bg-slate-900"
                      }`}
                    >
                      <span className="font-medium text-slate-600 dark:text-slate-400 w-12">{day.dayLabel.split(" ")[0]}</span>
                      {day.isWeekend && !record ? (
                        <span className="text-slate-400">Weekend</span>
                      ) : !record ? (
                        <span className="text-slate-400">Not submitted</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusInfo.classes}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {timeDisplay}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Weekly Cell Block for Desktop Grid
// ============================================================

interface WeeklyCellBlockProps {
  colleague: ColleagueItem;
  day: { dateStr: string; dayLabel: string; isWeekend: boolean; isToday: boolean };
  record?: TeamAvailability;
  color: typeof MEMBER_COLORS[0];
  isManager: boolean;
  onClick?: () => void;
}

function WeeklyCellBlock({ colleague, day, record, color, isManager, onClick }: WeeklyCellBlockProps) {
  // Weekend with no record
  if (day.isWeekend && !record) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-center rounded-lg py-2 px-1.5 text-[10px] font-medium bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer min-h-[64px] flex flex-col items-center justify-center transition group"
        title="Weekend — Click to enter working schedule"
      >
        <span>Weekend</span>
        <span className="text-[8px] text-blue-500 opacity-80 group-hover:opacity-100 mt-0.5">+ Enter time</span>
      </button>
    );
  }

  // Not submitted
  if (!record) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-center rounded-lg py-2 px-1.5 text-[10px] font-medium border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 cursor-pointer min-h-[64px] flex flex-col items-center justify-center transition"
      >
        <span>Not submitted</span>
        <span className="text-[8px] text-blue-500/80 mt-0.5">+ Enter time</span>
      </button>
    );
  }

  const statusInfo = getStatusVisual(record.status);
  const effectiveSlots = (record.slots && record.slots.length > 0)
    ? record.slots
    : parseAvailabilitySlots(record.startTime, record.endTime);
  const totalHours = calculateTotalHours(effectiveSlots, record.startTime, record.endTime);

  // Sunset check
  const lastSlot = effectiveSlots[effectiveSlots.length - 1];
  const endHour = parseInt((lastSlot?.endTime || record.endTime || "17:00").split(":")[0], 10);
  const [, mo] = day.dateStr.split("-").map(Number);
  const afterSunset = isAfterSunset(endHour, mo, "bd");

  // Holiday check
  const holiday = BD_HOLIDAYS[day.dateStr];

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${colleague.displayName} — ${statusInfo.label} — ${totalHours > 0 ? formatFriendlyDuration(totalHours) : ""}${record.note ? ` — "${record.note}"` : ""}`}
      className={`w-full rounded-lg py-1 px-1 text-[10px] font-medium cursor-pointer min-h-[64px] flex flex-col items-center justify-center gap-0.5 transition hover:opacity-90 active:scale-[0.98] ${
        afterSunset
          ? "bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600"
          : `${statusInfo.cellBg} border ${statusInfo.cellBorder}`
      }`}
      style={{ borderLeftColor: color.accent, borderLeftWidth: "3px" }}
    >
      {/* Status + Total Hours */}
      <div className="flex items-center gap-1">
        <span className={`font-bold ${afterSunset ? "text-slate-600 dark:text-slate-300" : statusInfo.cellText}`}>
          {record.status === "leave" ? "Leave" : record.status === "partial" ? "Partial" : record.status === "remote" ? "Remote" : record.status === "field" ? "Field" : "Indoor"}
        </span>
        {record.status !== "leave" && totalHours > 0 && (
          <span className="text-[8px] font-bold px-1 rounded bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
            {formatFriendlyDuration(totalHours)}
          </span>
        )}
      </div>

      {/* Slots */}
      {record.status !== "leave" && (
        <div className="flex flex-col items-center gap-0.5 w-full leading-tight">
          {effectiveSlots.length > 1 ? (
            effectiveSlots.slice(0, 3).map((s, idx) => (
              <span key={idx} className="text-[8px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-full">
                {toBd12h(s.startTime)}–{toBd12h(s.endTime)}
              </span>
            ))
          ) : (
            <>
              <span className="text-[9px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-0.5">
                🇧🇩 {toBd12h(effectiveSlots[0]?.startTime || record.startTime || "09:00")}–{toBd12h(effectiveSlots[0]?.endTime || record.endTime || "17:00")}
                {afterSunset && <Moon className="w-2 h-2 text-indigo-400 inline" />}
              </span>
              <span className="text-[8px] text-slate-500 dark:text-slate-400">
                🇩🇪 {convertBdToGerman(effectiveSlots[0]?.startTime || record.startTime || "09:00", day.dateStr)}–{convertBdToGerman(effectiveSlots[0]?.endTime || record.endTime || "17:00", day.dateStr)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Holiday indicator */}
      {holiday && (
        <span className="text-[8px] text-red-500 mt-0.5" title={holiday}>🎉</span>
      )}
    </button>
  );
}

// ============================================================
// Status Visual Helper
// ============================================================

function getStatusVisual(status?: AvailabilityStatus | string): {
  icon: string;
  label: string;
  classes: string;
  cellBg: string;
  cellText: string;
  cellBorder: string;
} {
  switch (status) {
    case "indoor":
    case "available":
      return {
        icon: "🏢",
        label: "Indoor",
        classes: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        cellBg: "bg-emerald-50 dark:bg-emerald-950/40",
        cellText: "text-emerald-700 dark:text-emerald-300",
        cellBorder: "border-emerald-200 dark:border-emerald-800",
      };
    case "partial":
      return {
        icon: "◑",
        label: "Partial",
        classes: "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
        cellBg: "bg-amber-50 dark:bg-amber-950/40",
        cellText: "text-amber-700 dark:text-amber-300",
        cellBorder: "border-amber-200 dark:border-amber-800",
      };
    case "leave":
      return {
        icon: "✗",
        label: "On Leave",
        classes: "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
        cellBg: "bg-rose-50 dark:bg-rose-950/40",
        cellText: "text-rose-700 dark:text-rose-300",
        cellBorder: "border-rose-200 dark:border-rose-800",
      };
    case "remote":
      return {
        icon: "☁",
        label: "Remote",
        classes: "bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
        cellBg: "bg-sky-50 dark:bg-sky-950/40",
        cellText: "text-sky-700 dark:text-sky-300",
        cellBorder: "border-sky-200 dark:border-sky-800",
      };
    case "field":
      return {
        icon: "⚑",
        label: "Field",
        classes: "bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
        cellBg: "bg-purple-50 dark:bg-purple-950/40",
        cellText: "text-purple-700 dark:text-purple-300",
        cellBorder: "border-purple-200 dark:border-purple-800",
      };
    default:
      return {
        icon: "—",
        label: "Not Submitted",
        classes: "bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700",
        cellBg: "bg-slate-50 dark:bg-slate-800/30",
        cellText: "text-slate-400",
        cellBorder: "border-dashed border-slate-300 dark:border-slate-700",
      };
  }
}
