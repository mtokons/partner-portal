import bcrypt from "bcryptjs";

const ROUNDS = 10;

/**
 * Generate a numeric PIN of the given length and return both the plaintext
 * (to display once to the user/owner) and a bcrypt hash for storage.
 */
export function generateGiftCardPinWithHash(length: number = 4): { plain: string; hash: string } {
  let pin = "";
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  const hash = bcrypt.hashSync(pin, ROUNDS);
  return { plain: pin, hash };
}

export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, ROUNDS);
}

/**
 * Constant-time-ish PIN check. Treats legacy "placeholder" / empty values as invalid
 * so we don't accept arbitrary input on un-initialised cards.
 */
export function verifyPin(pin: string, hash: string | undefined | null): boolean {
  if (!hash || hash === "placeholder") return false;
  // bcrypt hashes start with $2a$, $2b$, $2y$
  if (hash.startsWith("$2")) {
    try {
      return bcrypt.compareSync(pin, hash);
    } catch {
      return false;
    }
  }
  // Legacy plaintext PIN row — accept exact match but log as needing migration.
  return pin === hash;
}
