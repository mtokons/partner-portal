import type { DailyReportSummary } from "./availability";
import { STATUS_LABELS } from "./availability-config";

/**
 * Generates and downloads a CSV spreadsheet for the Daily Availability Report.
 */
export function exportDailyReportToCsv(report: DailyReportSummary): void {
  const rows: string[][] = [
    ["SCCG Career Lab — Daily Availability Report"],
    [`Date: ${report.date}`],
    [""],
    ["SUMMARY METRICS"],
    ["Available", "Partial", "On Leave", "Remote / Field", "Not Submitted", "Total Staff"],
    [
      String(report.availableCount),
      String(report.partialCount),
      String(report.leaveCount),
      String(report.remoteFieldCount),
      String(report.notSubmittedCount),
      String(report.totalUsers),
    ],
    [""],
    ["NOT FULLY AVAILABLE TODAY"],
    ["Colleague Name", "Email", "Department", "Status", "Time Range", "Notes"],
  ];

  if (report.notFullyAvailableList.length === 0) {
    rows.push(["None - all colleagues are available."]);
  } else {
    report.notFullyAvailableList.forEach((item) => {
      rows.push([
        item.userName,
        item.userEmail,
        item.department,
        STATUS_LABELS[item.status] || item.status,
        item.timeRange || "",
        item.note || "",
      ]);
    });
  }

  rows.push([""]);
  rows.push(["NOT SUBMITTED YET"]);
  rows.push(["Colleague Name", "Email", "Department"]);

  if (report.notSubmittedList.length === 0) {
    rows.push(["All colleagues submitted."]);
  } else {
    report.notSubmittedList.forEach((item) => {
      rows.push([item.userName, item.userEmail, item.department]);
    });
  }

  // Format as CSV
  const csvContent = rows
    .map((r) =>
      r
        .map((cell) => {
          const str = String(cell ?? "").replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `daily-availability-${report.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface PastWeekDayInfo {
  dateStr: string;
  dayName: string;
  dayLabel: string;
  dayOfWeek: number;
  isWeekend: boolean;
}

export interface ColleagueSummaryItem {
  id: string;
  email: string;
  displayName: string;
  department: string;
}

/**
 * Generates and downloads a comprehensive CSV report of all members' past week availability.
 */
export function exportPastWeekReportToCsv(
  weekDays: PastWeekDayInfo[],
  colleagues: ColleagueSummaryItem[],
  records: Array<{
    userId?: string;
    userEmail?: string;
    date: string;
    status: string;
    startTime?: string;
    endTime?: string;
    note?: string;
  }>
): void {
  const headerRow = [
    "Colleague Name",
    "Email",
    "Department",
    ...weekDays.map((d) => `${d.dayLabel} (${d.dateStr})`),
    "Working Days Submitted",
    "Days Missing",
    "Leave Days",
    "Total Logged Hours",
  ];

  const dataRows: string[][] = [];

  for (const c of colleagues) {
    let daysSubmitted = 0;
    let daysMissing = 0;
    let leaveDays = 0;
    let totalMinutes = 0;

    const dayCells = weekDays.map((day) => {
      const rec = records.find(
        (r) =>
          r.date === day.dateStr &&
          (r.userId === c.id || (r.userEmail && r.userEmail.toLowerCase() === c.email.toLowerCase()))
      );

      if (rec) {
        daysSubmitted++;
        if (rec.status === "leave") {
          leaveDays++;
          return "On Leave";
        }
        const timePart = rec.startTime && rec.endTime ? ` (${rec.startTime} - ${rec.endTime})` : "";
        const label = (STATUS_LABELS[rec.status] || rec.status) + timePart;
        if (rec.startTime && rec.endTime) {
          const [sH, sM] = rec.startTime.split(":").map(Number);
          const [eH, eM] = rec.endTime.split(":").map(Number);
          if (!isNaN(sH) && !isNaN(eH)) {
            const diff = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
            if (diff > 0) totalMinutes += diff;
          }
        }
        return label;
      } else {
        if (!day.isWeekend) {
          daysMissing++;
          return "MISSING";
        }
        return "Weekend (Off)";
      }
    });

    const hours = (totalMinutes / 60).toFixed(1);

    dataRows.push([
      c.displayName || c.email.split("@")[0],
      c.email,
      c.department || "SCCG",
      ...dayCells,
      String(daysSubmitted),
      String(daysMissing),
      String(leaveDays),
      `${hours} hrs`,
    ]);
  }

  const csvRows = [
    ["SCCG Career Lab — Past Week Team Availability Report"],
    [`Period: ${weekDays[0]?.dateStr} to ${weekDays[weekDays.length - 1]?.dateStr}`],
    [""],
    headerRow,
    ...dataRows,
  ];

  const csvContent = csvRows
    .map((r) =>
      r
        .map((cell) => {
          const str = String(cell ?? "").replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `past-week-availability-${weekDays[0]?.dateStr}-to-${weekDays[weekDays.length - 1]?.dateStr}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

