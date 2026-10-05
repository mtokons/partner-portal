"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Calendar as CalendarIcon, Clock, Globe, PlusCircle, Trash2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCalendarView } from "./TeamCalendarView";
import { toast } from "sonner";
import {
  getDhakaToday,
  getWeekDaysForAnchor,
  addDaysToDateStr,
  validateAvailabilityInput,
  formatFriendlyTime,
  calculateSlotHours,
  calculateTotalHours,
  formatFriendlyDuration,
  parseAvailabilitySlots,
} from "@/lib/availability";
import type { TeamAvailability, AvailabilityStatus, AvailabilityTimeSlot } from "@/types";

interface AvailabilityManagerProps {
  currentUserId: string;
  currentUserEmail: string;
  currentUserName: string;
  currentUserDept?: string;
  userRoles: string[];
  initialIsManager: boolean;
  baseConsole?: "admin" | "sccg";
}

/** Convert BD time "HH:mm" to German time (Europe/Berlin) for live preview */
function previewGermanTime(timeStr: string, dateStr: string): string {
  if (!timeStr || !dateStr) return "";
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const [y, mo, d] = dateStr.split("-").map(Number);
    const utcMs = Date.UTC(y, mo - 1, d, h - 6, m);
    const dt = new Date(utcMs);
    return dt.toLocaleTimeString("en-US", {
      timeZone: "Europe/Berlin",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function AvailabilityManager({
  currentUserId,
  currentUserEmail,
  currentUserName,
  currentUserDept,
  userRoles,
  initialIsManager,
  baseConsole = "admin",
}: AvailabilityManagerProps) {
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<string>(() => getDhakaToday());
  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<TeamAvailability[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [isAdminState, setIsAdminState] = useState<boolean>(() => {
    return (userRoles || []).some((r: string) => ["admin", "super_admin", "sccg-admin"].includes(r.toLowerCase())) || baseConsole === "admin";
  });
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>([]);

  // Dialog state: Time Entry / Schedule Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetColleagueId, setTargetColleagueId] = useState<string>(currentUserId);
  const [targetDate, setTargetDate] = useState<string>(() => getDhakaToday());
  const [status, setStatus] = useState<AvailabilityStatus>("indoor");
  const [slots, setSlots] = useState<AvailabilityTimeSlot[]>([
    { startTime: "06:00", endTime: "21:00", label: "Full Day" },
  ]);
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const weekDays = getWeekDaysForAnchor(currentWeekAnchor);
      const startRange = addDaysToDateStr(weekDays[0].dateStr, -14);
      const endRange = addDaysToDateStr(weekDays[6].dateStr, 21);

      const res = await fetch(`/api/availability?startDate=${startRange}&endDate=${endRange}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load availability");

      setRecords(data.records || []);
      setColleagues(data.colleagues || []);
      if (typeof data.isAdmin === "boolean") {
        setIsAdminState(data.isAdmin);
      }
      if (Array.isArray(data.hiddenMemberIds)) {
        setHiddenMemberIds(data.hiddenMemberIds);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch availability data");
    } finally {
      setLoading(false);
    }
  }, [currentWeekAnchor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal from card click or cell click
  const handleSelectCell = (params: {
    colleague: any;
    dateStr: string;
    existingRecord?: TeamAvailability;
  }) => {
    const isSelf =
      params.colleague.id === currentUserId ||
      params.colleague.email?.toLowerCase() === currentUserEmail.toLowerCase();

    if (!initialIsManager && !isSelf) {
      toast.info("You can only edit your own schedule.");
      return;
    }

    const resolvedSlots = (params.existingRecord?.slots && params.existingRecord.slots.length > 0)
      ? params.existingRecord.slots
      : parseAvailabilitySlots(params.existingRecord?.startTime, params.existingRecord?.endTime);

    setTargetColleagueId(params.colleague.id);
    setTargetDate(params.dateStr);
    setStatus(params.existingRecord?.status || "indoor");
    setSlots(
      resolvedSlots.length > 0
        ? resolvedSlots
        : [{ startTime: "09:00", endTime: "17:00", label: "Slot 1" }]
    );
    setNote(params.existingRecord?.note || "");
    setOverrideReason("");
    setModalOpen(true);
  };

  // Open modal specifically for logged-in user
  const handleOpenMyEntry = (dateStr?: string) => {
    const effectiveDate = dateStr || getDhakaToday();
    const existing = records.find(
      (r) =>
        (r.userId === currentUserId || r.userEmail?.toLowerCase() === currentUserEmail.toLowerCase()) &&
        r.date === effectiveDate
    );

    const resolvedSlots = (existing?.slots && existing.slots.length > 0)
      ? existing.slots
      : parseAvailabilitySlots(existing?.startTime, existing?.endTime);

    setTargetColleagueId(currentUserId);
    setTargetDate(effectiveDate);
    setStatus(existing?.status || "indoor");
    setSlots(
      resolvedSlots.length > 0
        ? resolvedSlots
        : [{ startTime: "09:00", endTime: "17:00", label: "Slot 1" }]
    );
    setNote(existing?.note || "");
    setOverrideReason("");
    setModalOpen(true);
  };

  // Slot management handlers
  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    let newStart = "14:00";
    let newEnd = "16:00";
    if (lastSlot && lastSlot.endTime) {
      const [h, m] = lastSlot.endTime.split(":").map(Number);
      const nextH = Math.min(22, h + 1);
      const nextEndH = Math.min(23, nextH + 2);
      newStart = `${String(nextH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
      newEnd = `${String(nextEndH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    }
    setSlots((prev) => [
      ...prev,
      { startTime: newStart, endTime: newEnd, label: `Slot ${prev.length + 1}` },
    ]);
  };

  const handleUpdateSlot = (index: number, field: keyof AvailabilityTimeSlot, val: string) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [field]: val } : s))
    );
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) {
      toast.info("At least one time slot is required.");
      return;
    }
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Apply Quick Time Preset
  const applyPresetSlots = (presetSlots: AvailabilityTimeSlot[]) => {
    setSlots(presetSlots);
  };

  // Submit Schedule Entry
  const handleSaveEntry = async () => {
    const targetColleague =
      colleagues.find((c) => c.id === targetColleagueId) || {
        id: currentUserId,
        displayName: currentUserName,
        email: currentUserEmail,
        department: currentUserDept,
      };

    const isSelf =
      targetColleague.id === currentUserId ||
      targetColleague.email?.toLowerCase() === currentUserEmail.toLowerCase();

    const validation = validateAvailabilityInput({
      status,
      slots: status === "leave" ? undefined : slots,
      note,
    });
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetColleague.id,
          userName: targetColleague.displayName,
          userEmail: targetColleague.email,
          department: targetColleague.department,
          date: targetDate,
          status,
          startTime: status === "leave" ? undefined : slots[0]?.startTime,
          endTime: status === "leave" ? undefined : slots[slots.length - 1]?.endTime,
          slots: status === "leave" ? undefined : slots,
          note,
          isOverride: initialIsManager && !isSelf,
          overrideReason: overrideReason || (initialIsManager && !isSelf ? "Manager update" : undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save availability");

      toast.success(
        `Availability saved for ${targetColleague.displayName} on ${targetDate}.`
      );
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const selectedColleague =
    colleagues.find((c) => c.id === targetColleagueId) || {
      id: currentUserId,
      displayName: currentUserName,
      email: currentUserEmail,
      department: currentUserDept,
    };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Team Availability
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor colleague schedules, German &amp; Bangladesh working hours, and manage office availability.
          </p>
        </div>
      </div>

      {/* Main Single Clean Colorful View: Team Calendar */}
      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm text-slate-500">Loading team availability...</p>
        </div>
      ) : (
        <TeamCalendarView
          currentWeekAnchor={currentWeekAnchor}
          onWeekChange={setCurrentWeekAnchor}
          records={records}
          colleagues={colleagues}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          isManager={initialIsManager}
          isAdmin={isAdminState}
          initialHiddenMemberIds={hiddenMemberIds}
          onSelectCell={handleSelectCell}
          onOpenMyEntry={handleOpenMyEntry}
        />
      )}

      {/* TIME ENTRY & EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header (Sticky Top) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Enter / Update Schedule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set working hours &amp; location for this date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain">
              {/* Member Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Team Member
                </label>
                {initialIsManager ? (
                  <select
                    value={targetColleagueId}
                    onChange={(e) => setTargetColleagueId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    {colleagues.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} ({c.department || "SCCG"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {selectedColleague.displayName} ({selectedColleague.department || "SCCG"})
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetDate(getDhakaToday())}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDate(addDaysToDateStr(getDhakaToday(), 1))}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => e.target.value && setTargetDate(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Picker (visual badges) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Work Mode / Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "indoor", label: "🏢 Indoor / Office", desc: "Working in office" },
                    { id: "remote", label: "☁ Remote", desc: "Work from home" },
                    { id: "field", label: "⚑ Field Work", desc: "Out on site / field" },
                    { id: "partial", label: "◑ Partial Day", desc: "Custom limited hours" },
                    { id: "leave", label: "✗ On Leave", desc: "Day off / Holiday" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id as AvailabilityStatus)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        status === s.id
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {s.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {s.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Working Hours & Multiple Slots (for all statuses except on leave) */}
              {status !== "leave" && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Daily Time Slots (Bangladesh BST &amp; German CET)
                    </label>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Total: {formatFriendlyDuration(calculateTotalHours(slots))} ({slots.length} {slots.length === 1 ? "slot" : "slots"})
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                      Quick Slot Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          applyPresetSlots([
                            { startTime: "08:00", endTime: "10:00", label: "Morning" },
                            { startTime: "16:00", endTime: "18:00", label: "Evening" },
                            { startTime: "20:00", endTime: "22:00", label: "Night" },
                          ])
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        ⭐ 6h Split (3x 2h: Morning, Eve, Night)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPresetSlots([
                            { startTime: "09:00", endTime: "11:00", label: "Morning" },
                            { startTime: "17:00", endTime: "19:00", label: "Evening" },
                          ])
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 transition"
                      >
                        4h Split (2x 2h)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPresetSlots([
                            { startTime: "06:00", endTime: "21:00", label: "Full Day" },
                          ])
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 transition"
                      >
                        6:00 AM – 9:00 PM (Full Day)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyPresetSlots([
                            { startTime: "09:00", endTime: "17:00", label: "Standard" },
                          ])
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 transition"
                      >
                        9:00 AM – 5:00 PM (Standard)
                      </button>
                    </div>
                  </div>

                  {/* List of Multiple Slots */}
                  <div className="space-y-2.5">
                    {slots.map((slot, index) => {
                      const slotDuration = calculateSlotHours(slot.startTime, slot.endTime);
                      const deStart = previewGermanTime(slot.startTime, targetDate);
                      const deEnd = previewGermanTime(slot.endTime, targetDate);

                      return (
                        <div
                          key={index}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2 shadow-xs"
                        >
                          {/* Slot Header: Label, Duration, Remove */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <input
                                type="text"
                                value={slot.label || `Slot ${index + 1}`}
                                onChange={(e) => handleUpdateSlot(index, "label", e.target.value)}
                                placeholder="e.g. Morning, Evening"
                                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:outline-hidden py-0.5 px-1 max-w-[130px]"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                {formatFriendlyDuration(slotDuration)}
                              </span>
                              {slots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(index)}
                                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                  title="Remove this slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Time Inputs */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                                Start (BST)
                              </span>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleUpdateSlot(index, "startTime", e.target.value)}
                                className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                                End (BST)
                              </span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleUpdateSlot(index, "endTime", e.target.value)}
                                className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Dual Timezone Live Preview for this slot */}
                          <div className="flex flex-wrap items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-700/60 text-slate-500">
                            <span className="font-medium">
                              🇧🇩 BST: <strong className="text-slate-800 dark:text-slate-200">{formatFriendlyTime(slot.startTime)} – {formatFriendlyTime(slot.endTime)}</strong>
                            </span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              🇩🇪 DE: <strong>{deStart || "—"} – {deEnd || "—"}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Slot Button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Add Another Time Slot
                    </button>

                    <span className="text-[11px] text-slate-500">
                      {slots.length} of max 6 slots
                    </span>
                  </div>
                </div>
              )}

              {/* Note input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Working indoor from 6 AM to 9 PM, office meeting"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Manager Override Reason (if editing another colleague) */}
              {initialIsManager &&
                targetColleagueId !== currentUserId &&
                selectedColleague.email?.toLowerCase() !== currentUserEmail.toLowerCase() && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Reason for Manager Update (Audit Log)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule request on behalf of member"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
            </div>

            {/* Modal Actions (Sticky Bottom) */}
            <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="text-xs h-9 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEntry}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-sm gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
