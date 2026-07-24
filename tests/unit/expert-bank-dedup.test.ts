import { describe, expect, it } from "vitest";
import { normalizeExpertKey } from "@/lib/expert-bank";

// The project → Master Expert Bank migration de-duplicates people using this key,
// so the same expert staffed on multiple projects only ever creates one bank record.
describe("normalizeExpertKey (migration dedup)", () => {
  it("prefers email and is case/space insensitive", () => {
    expect(normalizeExpertKey({ email: "Jane.Doe@Example.com", name: "Jane Doe" }))
      .toBe("jane.doe@example.com");
    expect(normalizeExpertKey({ email: " JANE.DOE@example.com ", name: "Someone Else" }))
      .toBe("jane.doe@example.com");
  });

  it("falls back to a normalized name when no valid email is present", () => {
    expect(normalizeExpertKey({ name: "  Jane   Doe " })).toBe("jane doe");
    expect(normalizeExpertKey({ email: "not-an-email", name: "Jane Doe" })).toBe("jane doe");
  });

  it("produces the same key for the same person across projects", () => {
    const fromProjectA = normalizeExpertKey({ name: "Jane Doe" });
    const fromProjectB = normalizeExpertKey({ name: "jane doe" });
    expect(fromProjectA).toBe(fromProjectB);
  });

  it("returns an empty key when there is nothing to identify", () => {
    expect(normalizeExpertKey({})).toBe("");
  });
});
