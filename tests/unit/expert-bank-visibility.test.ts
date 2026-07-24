import { describe, expect, it } from "vitest";
import { isExpertVisibleToPartner, type BankExpert } from "@/lib/expert-bank";

const baseExpert: BankExpert = {
  id: "e1",
  normalizedKey: "a",
  expertName: "Jane Doe",
  email: "jane@example.com",
  position: "Lead",
  nationality: "German",
  currentLocation: "Berlin",
  level: "Senior",
  status: "available",
  bookingType: "",
  lockedByPartnerId: "",
  lockedByPartnerName: "",
  assignedProjectId: "",
  assignedProjectName: "",
  offeredTo: [],
  tags: "",
  createdBy: "admin",
  createdAt: "2024-01-01",
};

describe("isExpertVisibleToPartner", () => {
  it("hides experts assigned to a different partner", () => {
    const expert = { ...baseExpert, lockedByPartnerId: "partner-b", lockedByPartnerName: "Partner B" };
    expect(isExpertVisibleToPartner(expert, "partner-a")).toBe(false);
  });

  it("keeps experts visible for their assigned partner", () => {
    const expert = { ...baseExpert, lockedByPartnerId: "partner-a", lockedByPartnerName: "Partner A" };
    expect(isExpertVisibleToPartner(expert, "partner-a")).toBe(true);
  });

  it("keeps pool experts visible when no partner assignment exists", () => {
    expect(isExpertVisibleToPartner(baseExpert, "partner-a")).toBe(true);
  });

  it("hides inactive experts from partner visibility", () => {
    const expert = { ...baseExpert, status: "inactive" as const };
    expect(isExpertVisibleToPartner(expert, "partner-a")).toBe(false);
  });
});
