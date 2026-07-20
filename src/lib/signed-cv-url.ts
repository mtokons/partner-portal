import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "sccg-cv-preview-secret-2026").slice(0, 64);
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSignedCvAccessUrl(cvId: string, opts?: { ttlMs?: number; download?: boolean }): string {
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = Date.now() + ttlMs;
  const payload = JSON.stringify({ cvId, expiresAt, download: !!opts?.download });
  const encoded = Buffer.from(payload).toString("base64url");
  const token = `${encoded}.${sign(encoded)}`;
  return `/api/expert-cv/${encodeURIComponent(cvId)}?token=${encodeURIComponent(token)}`;
}

export function verifySignedCvAccessUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) return false;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return false;
    const expected = sign(encoded);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return typeof payload?.expiresAt === "number" && Date.now() < payload.expiresAt;
  } catch {
    return false;
  }
}
