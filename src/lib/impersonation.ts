/**
 * Impersonation utility — signed cookie-based admin "View As User" feature.
 *
 * Security model:
 * - Only admin sessions can create tokens.
 * - Token is a signed HMAC-SHA256 payload stored in an httpOnly cookie.
 * - Token expires in 2 hours and is invalidated on exit.
 * - No real authentication credentials are transferred.
 * - All impersonation activity is visible via the permanent banner shown to admin.
 */

import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

const COOKIE_NAME = "__sccg_impersonate";
const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

function getSecret(): string {
  return (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "sccg-impersonate-secret-2026").slice(0, 64);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export interface ImpersonationPayload {
  adminEmail: string;
  adminName: string;
  targetId: string;
  targetEmail: string;
  targetName: string;
  targetRoles: string[];
  targetPrimaryConsole: string;
  /** Resolved SharePoint Partners list id for partner targets (optional). */
  targetPartnerId?: string;
  exp: number; // epoch ms
}

/**
 * Encode and sign an impersonation payload into a cookie value.
 */
export function encodeImpersonationToken(payload: ImpersonationPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

/**
 * Verify and decode an impersonation cookie value.
 * Returns null if invalid or expired.
 */
export function decodeImpersonationToken(token: string): ImpersonationPayload | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expectedSig = sign(b64);
    if (sig !== expectedSig) return null;
    const payload: ImpersonationPayload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Create an impersonation token and set it as an httpOnly cookie.
 */
export async function setImpersonationCookie(payload: Omit<ImpersonationPayload, "exp">): Promise<void> {
  const full: ImpersonationPayload = { ...payload, exp: Date.now() + EXPIRY_MS };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeImpersonationToken(full), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: EXPIRY_MS / 1000,
    path: "/",
  });
}

/**
 * Clear the impersonation cookie.
 */
export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read and validate the current impersonation cookie (server-side only).
 */
export async function getImpersonationSession(): Promise<ImpersonationPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeImpersonationToken(raw);
}
