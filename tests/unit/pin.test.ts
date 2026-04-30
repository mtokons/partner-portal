import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, generateGiftCardPinWithHash } from "../../src/lib/pin";

describe("pin", () => {
  it("hashPin produces a bcrypt hash that verifyPin accepts", () => {
    const hash = hashPin("1234");
    expect(hash.startsWith("$2")).toBe(true);
    expect(verifyPin("1234", hash)).toBe(true);
    expect(verifyPin("0000", hash)).toBe(false);
  });

  it("verifyPin rejects placeholder/empty hashes", () => {
    expect(verifyPin("1234", "placeholder")).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
    expect(verifyPin("1234", null)).toBe(false);
  });

  it("generateGiftCardPinWithHash returns numeric PIN of given length", () => {
    const { plain, hash } = generateGiftCardPinWithHash(6);
    expect(plain).toMatch(/^\d{6}$/);
    expect(verifyPin(plain, hash)).toBe(true);
  });
});
