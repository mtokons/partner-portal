import { describe, it, expect } from "vitest";
import { escapeOData } from "../../src/lib/graph";

describe("escapeOData", () => {
  it("doubles single quotes for OData literal safety", () => {
    expect(escapeOData("O'Brien")).toBe("O''Brien");
  });

  it("strips control characters", () => {
    expect(escapeOData("hello\x00world\x1f")).toBe("helloworld");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeOData("abc-123_XYZ")).toBe("abc-123_XYZ");
  });

  it("handles empty string", () => {
    expect(escapeOData("")).toBe("");
  });

  it("escapes multiple quotes", () => {
    expect(escapeOData("a'b'c'")).toBe("a''b''c''");
  });
});
