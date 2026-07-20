import { describe, expect, it } from "vitest";
import { resolvePreferredCvId } from "@/lib/expert-bank";

describe("resolvePreferredCvId", () => {
  it("prefers a requested CV id when it exists", () => {
    const cvs = [
      { id: "cv-1", expertId: "e1", fileName: "old.docx", drivePath: "/a", format: "giz", tailored: false, torExcerptId: "", projectId: "", createdBy: "", createdAt: "2024-01-01" },
      { id: "cv-2", expertId: "e1", fileName: "new.docx", drivePath: "/b", format: "custom1", tailored: true, torExcerptId: "", projectId: "", createdBy: "", createdAt: "2024-02-01" },
    ];

    expect(resolvePreferredCvId(cvs, "cv-1")).toBe("cv-1");
  });

  it("falls back to the newest CV when no explicit choice is provided", () => {
    const cvs = [
      { id: "cv-1", expertId: "e1", fileName: "old.docx", drivePath: "/a", format: "giz", tailored: false, torExcerptId: "", projectId: "", createdBy: "", createdAt: "2024-01-01" },
      { id: "cv-2", expertId: "e1", fileName: "new.docx", drivePath: "/b", format: "custom1", tailored: true, torExcerptId: "", projectId: "", createdBy: "", createdAt: "2024-02-01" },
    ];

    expect(resolvePreferredCvId(cvs)).toBe("cv-2");
  });

  it("returns null when no CVs exist", () => {
    expect(resolvePreferredCvId([])).toBeNull();
  });
});
