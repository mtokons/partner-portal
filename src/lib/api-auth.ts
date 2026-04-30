import { auth } from "@/auth";
import type { SessionUser } from "@/types";

/**
 * Returns the authenticated session user, or null if not signed in.
 * Centralized helper used by API routes to avoid repeated boilerplate.
 */
export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/**
 * True if the user owns the resource via partnerId, customerId, expertId, or has admin/finance role.
 */
export function canAccess(user: SessionUser, resource: { partnerId?: string; clientId?: string; customerId?: string; expertId?: string; ownerUserId?: string }): boolean {
  const roles = (user.roles || [user.role]).map((r) => String(r).toLowerCase());
  if (roles.includes("admin") || roles.includes("finance")) return true;
  if (resource.partnerId && resource.partnerId === user.partnerId) return true;
  if (resource.customerId && resource.customerId === user.customerId) return true;
  if (resource.expertId && resource.expertId === user.expertId) return true;
  if (resource.ownerUserId && resource.ownerUserId === user.id) return true;
  return false;
}

/**
 * Common bot/prefetcher User-Agent fragments. Used to skip mutating side-effects
 * triggered by automated link previews (Outlook SafeLinks, Slack, Twitter, etc.).
 */
const BOT_UA_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /preview/i, /scanner/i,
  /SafeLinks/i, /OfficeProtect/i, /Slackbot/i, /facebookexternalhit/i,
  /Twitterbot/i, /WhatsApp/i, /LinkedInBot/i, /Discordbot/i, /Telegram/i,
  /HeadlessChrome/i, /Googlebot/i, /Pingdom/i, /UptimeRobot/i,
];

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // no UA = treat as bot
  return BOT_UA_PATTERNS.some((re) => re.test(userAgent));
}
