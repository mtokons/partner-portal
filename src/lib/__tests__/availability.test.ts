import { describe, it, expect } from "vitest";
import {
  getDhakaParts,
  isDateWeekend,
  checkColleagueEditPermission,
  validateAvailabilityInput,
  calculateDailyReport,
  getWeekDaysForAnchor,
  formatFriendlyTime,
  formatTimeRange,
} from "../availability";

describe("Team Availability Business Rules", () => {
  describe("Weekend detection (Asia/Dhaka default: Friday & Saturday)", () => {
    it("correctly identifies Friday and Saturday as weekends", () => {
      // 2026-10-02 is Friday
      expect(isDateWeekend("2026-10-02")).toBe(true);
      // 2026-10-03 is Saturday
      expect(isDateWeekend("2026-10-03")).toBe(true);
      // 2026-10-04 is Sunday (working day)
      expect(isDateWeekend("2026-10-04")).toBe(false);
      // 2026-10-05 is Monday (working day)
      expect(isDateWeekend("2026-10-05")).toBe(false);
    });
  });

  describe("Validation Rules", () => {
    it("accepts valid available entry", () => {
      const res = validateAvailabilityInput({
        status: "available",
      });
      expect(res.valid).toBe(true);
    });

    it("rejects invalid status", () => {
      const res = validateAvailabilityInput({
        status: "busy" as any,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/valid status/);
    });

    it("requires start and end time for partial status", () => {
      const res = validateAvailabilityInput({
        status: "partial",
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Start time and end time are required/);
    });

    it("enforces 30-minute intervals for partial status", () => {
      const invalid = validateAvailabilityInput({
        status: "partial",
        startTime: "10:15",
        endTime: "13:00",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toMatch(/30-minute intervals/);

      const valid = validateAvailabilityInput({
        status: "partial",
        startTime: "10:30",
        endTime: "14:00",
      });
      expect(valid.valid).toBe(true);
    });

    it("enforces end_time strictly after start_time", () => {
      const res = validateAvailabilityInput({
        status: "partial",
        startTime: "14:00",
        endTime: "12:00",
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/after start time/);
    });

    it("enforces note max length of 200 characters", () => {
      const longNote = "a".repeat(201);
      const res = validateAvailabilityInput({
        status: "available",
        note: longNote,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/200 characters/);
    });
  });

  describe("Colleague Window and Cut-off Rules", () => {
    it("blocks past and same-day editing for colleagues", () => {
      // Mock today at 10:00 AM UTC (4:00 PM Dhaka)
      const mockNowDhaka = new Date("2026-10-04T04:00:00Z"); // 10:00 AM Dhaka
      const todayStr = "2026-10-04";

      const pastResult = checkColleagueEditPermission("2026-10-03", mockNowDhaka);
      expect(pastResult.allowed).toBe(false);

      const todayResult = checkColleagueEditPermission(todayStr, mockNowDhaka);
      expect(todayResult.allowed).toBe(false);
      expect(todayResult.reason).toMatch(/Same-day or past entries are locked/);
    });

    it("allows editing within the 1 to 7 day rolling window before cut-off", () => {
      // Sunday Oct 4 at 2:00 PM Dhaka
      const mockNow = new Date("2026-10-04T08:00:00Z"); // 14:00 Dhaka (2:00 PM)

      // Tomorrow: Monday Oct 5 (working day) -> allowed!
      const tomorrowResult = checkColleagueEditPermission("2026-10-05", mockNow);
      expect(tomorrowResult.allowed).toBe(true);

      // Oct 8 (Thursday) -> allowed!
      const thuResult = checkColleagueEditPermission("2026-10-08", mockNow);
      expect(thuResult.allowed).toBe(true);

      // Oct 12 (8 days ahead) -> beyond 7 days window
      const farResult = checkColleagueEditPermission("2026-10-12", mockNow);
      expect(farResult.allowed).toBe(false);
      expect(farResult.reason).toMatch(/up to 7 days/);
    });

    it("enforces 5:00 PM cut-off on the previous day", () => {
      // Sunday Oct 4 at 5:01 PM Dhaka (17:01)
      const mockAfterCutoff = new Date("2026-10-04T11:01:00Z"); // 17:01 Dhaka

      // Tomorrow is Monday Oct 5. Cut-off was 17:00 on Sunday Oct 4.
      const res = checkColleagueEditPermission("2026-10-05", mockAfterCutoff);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/closed at 17:00/);

      // But Tuesday Oct 6 (2 days ahead) should still be editable!
      const dayAfterTomorrow = checkColleagueEditPermission("2026-10-06", mockAfterCutoff);
      expect(dayAfterTomorrow.allowed).toBe(true);
    });
  });

  describe("Daily Availability Report Calculation", () => {
    it("accurately computes counts and lists for daily summary", () => {
      const users = [
        { id: "u1", email: "rahim@mysccg.de", displayName: "Rahim", department: "Operations" },
        { id: "u2", email: "nusrat@mysccg.de", displayName: "Nusrat", department: "Sales" },
        { id: "u3", email: "karim@mysccg.de", displayName: "Karim", department: "Operations" },
        { id: "u4", email: "sumaiya@mysccg.de", displayName: "Sumaiya", department: "HR" },
        { id: "u5", email: "farhana@mysccg.de", displayName: "Farhana", department: "Sales" },
      ];

      const records = [
        {
          id: "r1",
          userId: "u1",
          userName: "Rahim",
          userEmail: "rahim@mysccg.de",
          department: "Operations",
          date: "2026-10-04",
          status: "available" as const,
        },
        {
          id: "r2",
          userId: "u2",
          userName: "Nusrat",
          userEmail: "nusrat@mysccg.de",
          department: "Sales",
          date: "2026-10-04",
          status: "partial" as const,
          startTime: "14:00",
          endTime: "18:00",
          note: "Doctor appointment morning",
        },
        {
          id: "r3",
          userId: "u3",
          userName: "Karim",
          userEmail: "karim@mysccg.de",
          department: "Operations",
          date: "2026-10-04",
          status: "remote" as const,
        },
        {
          id: "r4",
          userId: "u4",
          userName: "Sumaiya",
          userEmail: "sumaiya@mysccg.de",
          department: "HR",
          date: "2026-10-04",
          status: "leave" as const,
          note: "Annual leave",
        },
        // u5 has no record for 2026-10-04
      ];

      const report = calculateDailyReport("2026-10-04", users, records);

      expect(report.totalUsers).toBe(5);
      expect(report.availableCount).toBe(1);
      expect(report.partialCount).toBe(1);
      expect(report.remoteFieldCount).toBe(1);
      expect(report.leaveCount).toBe(1);
      expect(report.notSubmittedCount).toBe(1);

      // Not fully available list should contain Nusrat and Sumaiya
      expect(report.notFullyAvailableList).toHaveLength(2);
      expect(report.notFullyAvailableList.map((x) => x.userName)).toEqual(["Nusrat", "Sumaiya"]);

      // Not submitted list should contain Farhana
      expect(report.notSubmittedList).toHaveLength(1);
      expect(report.notSubmittedList[0].userName).toBe("Farhana");
    });
  });

  describe("Time Formatting Helpers", () => {
    it("formats 24-hour time to user-friendly am/pm representation", () => {
      expect(formatFriendlyTime("10:00")).toBe("10 AM");
      expect(formatFriendlyTime("13:30")).toBe("1:30 PM");
      expect(formatFriendlyTime("18:00")).toBe("6 PM");
      expect(formatTimeRange("10:00", "13:00")).toBe("10 AM to 1 PM");
      expect(formatTimeRange("14:00", "18:00")).toBe("2 PM to 6 PM");
    });
  });
});
