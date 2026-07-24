import { describe, it, expect } from "vitest";
import { createSignedCvAccessUrl, verifySignedCvAccessUrl } from "../../src/lib/signed-cv-url";

describe("signed CV access URL", () => {
  it("creates and validates a short-lived preview URL", () => {
    const href = createSignedCvAccessUrl("cv-123", { ttlMs: 60_000 });

    expect(href).toContain("/api/expert-cv/cv-123");
    expect(href).toContain("token=");
    expect(verifySignedCvAccessUrl(href)).toBe(true);
  });

  it("rejects expired tokens", () => {
    const href = createSignedCvAccessUrl("cv-123", { ttlMs: -1 });
    expect(verifySignedCvAccessUrl(href)).toBe(false);
  });
});
