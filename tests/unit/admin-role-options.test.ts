import { describe, it, expect } from "vitest";
import { AVAILABLE_ROLES } from "@/lib/role-options";

describe("admin role options", () => {
  it("includes project partner roles in the admin user-role picker", () => {
    const roleIds = AVAILABLE_ROLES.map((role) => role.id);

    expect(roleIds).toContain("project-partner");
    expect(roleIds).toContain("project-partner-admin");
  });
});
