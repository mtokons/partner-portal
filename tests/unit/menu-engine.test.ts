import { describe, it, expect } from "vitest";
import {
  resolveConsole,
  resolveMenu,
  groupMenuItems,
  DEFAULT_MENUS,
  getAllAvailableMenuItems,
} from "@/lib/menu-engine";

describe("menu-engine", () => {
  it("resolveConsole returns admin for admin role", () => {
    expect(resolveConsole(["admin"])).toBe("admin");
    expect(resolveConsole(["admin", "partner"])).toBe("admin");
  });

  it("resolveConsole returns partner for partner role", () => {
    expect(resolveConsole(["partner"])).toBe("partner");
  });

  it("resolveConsole returns customer for customer role", () => {
    expect(resolveConsole(["customer"])).toBe("customer");
  });

  it("resolveConsole returns expert for expert role", () => {
    expect(resolveConsole(["expert"])).toBe("expert");
  });

  it("resolveConsole defaults to partner for unknown roles", () => {
    expect(resolveConsole([])).toBe("partner");
    expect(resolveConsole(["unknown"])).toBe("partner");
  });

  it("resolveMenu returns default items when no overrides", () => {
    const menu = resolveMenu("partner");
    expect(menu.length).toBe(DEFAULT_MENUS.partner.length);
    expect(menu[0].key).toBe("partner.dashboard");
  });

  it("resolveMenu applies role overrides — disabled items are filtered out", () => {
    const overrides = [{
      id: "1", scope: "role" as const, menuKey: "partner.marketplace", isEnabled: false,
      itemOrder: 0, label: "", href: "", icon: "", groupName: "", groupOrder: 0,
      isDefault: false, isLocked: false, createdAt: "", createdBy: "",
    }];
    const menu = resolveMenu("partner", overrides);
    const marketplace = menu.find((m) => m.key === "partner.marketplace");
    // Disabled items are filtered out of the resolved menu
    expect(marketplace).toBeUndefined();
  });

  it("resolveMenu does not override locked items", () => {
    const overrides = [{
      id: "1", scope: "role" as const, menuKey: "partner.dashboard", isEnabled: false,
      itemOrder: 0, label: "", href: "", icon: "", groupName: "", groupOrder: 0,
      isDefault: false, isLocked: false, createdAt: "", createdBy: "",
    }];
    const menu = resolveMenu("partner", overrides);
    const dashboard = menu.find((m) => m.key === "partner.dashboard");
    expect(dashboard?.isEnabled).toBe(true);
  });

  it("groupMenuItems groups by group field", () => {
    const items = resolveMenu("partner");
    const groups = groupMenuItems(items);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].group).toBeDefined();
    expect(groups[0].items.length).toBeGreaterThan(0);
  });

  it("getAllAvailableMenuItems returns items from all consoles", () => {
    const all = getAllAvailableMenuItems();
    expect(all.length).toBeGreaterThan(DEFAULT_MENUS.partner.length);
  });

  it("DEFAULT_MENUS has entries for all console types", () => {
    expect(DEFAULT_MENUS.partner.length).toBeGreaterThan(0);
    expect(DEFAULT_MENUS.admin.length).toBeGreaterThan(0);
    expect(DEFAULT_MENUS.customer.length).toBeGreaterThan(0);
    expect(DEFAULT_MENUS.expert.length).toBeGreaterThan(0);
    expect(DEFAULT_MENUS.student.length).toBeGreaterThan(0);
  });

  it("admin menu includes email-templates", () => {
    const adminMenu = DEFAULT_MENUS.admin;
    const emailTemplates = adminMenu.find((m) => m.key === "admin.email-templates");
    expect(emailTemplates).toBeDefined();
    expect(emailTemplates?.href).toBe("/admin/email-templates");
  });

  it("admin menu has a single Master Expert Bank entry (no duplicate Expert Evaluations link)", () => {
    const adminMenu = DEFAULT_MENUS.admin;
    const bankLinks = adminMenu.filter((m) => m.href === "/admin/expert-bank");
    expect(bankLinks.length).toBe(1);
    expect(bankLinks[0].key).toBe("admin.expert-bank");
    // The old redundant evaluations shortcut should no longer exist
    expect(adminMenu.find((m) => m.key === "admin.project-eval")).toBeUndefined();
  });
});
