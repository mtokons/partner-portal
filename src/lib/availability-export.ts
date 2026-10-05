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
