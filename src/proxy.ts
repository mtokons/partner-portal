import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";

/**
 * Console-to-role mapping.
 * Each console path requires the user to hold at least one of the listed roles.
 */
const CONSOLE_ROLES: Record<string, string[]> = {
  "/partner":  ["partner", "partner-individual", "partner-institutional"],
  "/admin":    ["admin"],
  "/student":  ["student"],
  "/customer": ["customer"],
  "/expert":   ["expert", "teacher"],
};

/** Ordered by priority — first match wins for login redirect */
const ROLE_CONSOLE: [string[], string][] = [
  [["admin"],    "/admin/dashboard"],
  [["partner", "partner-individual", "partner-institutional"], "/partner/dashboard"],
  [["customer"], "/customer/dashboard"],
  [["expert", "teacher"],   "/expert/dashboard"],
  [["student"],  "/student/dashboard"],
];

function resolveDefaultConsole(roles: string[]): string {
  const lowerRoles = roles.map((r) => r.toLowerCase());
  for (const [requiredRoles, path] of ROLE_CONSOLE) {
    if (requiredRoles.some((r) => lowerRoles.includes(r))) return path;
  }
  return "/login";
}

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;
  const roles = ((req.auth?.user as { roles?: string[] } | undefined)?.roles || [role]).filter(Boolean) as string[];

  // --- Public paths: no auth required ---
  const publicPaths = ["/login", "/customer-login", "/expert-login", "/register", "/forgot-password"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/livez") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/offer-response");

  if (isPublic) {
    // If already logged in, redirect away from login pages
    if (isLoggedIn) {
      if (pathname === "/login" || pathname === "/customer-login" || pathname === "/expert-login") {
        return NextResponse.redirect(new URL(resolveDefaultConsole(roles), req.url));
      }
    }
    return NextResponse.next();
  }

  // --- Not logged in: redirect to appropriate login page ---
  if (!isLoggedIn) {
    if (pathname.startsWith("/customer")) return NextResponse.redirect(new URL("/customer-login", req.url));
    if (pathname.startsWith("/expert")) return NextResponse.redirect(new URL("/expert-login", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // --- Console-based access control ---
  const lowerRoles = roles.map((r) => r.toLowerCase());

  for (const [consolePath, requiredRoles] of Object.entries(CONSOLE_ROLES)) {
    if (pathname.startsWith(consolePath)) {
      const hasAccess = requiredRoles.some((r) => lowerRoles.includes(r));
      if (!hasAccess) {
        // Redirect to user's own console
        return NextResponse.redirect(new URL(resolveDefaultConsole(roles), req.url));
      }
      return NextResponse.next();
    }
  }

  // --- Shared pages (dashboard, shop, profile, etc.) ---
  // These are accessible by any authenticated user with a portal role
  const portalRoles = ["partner", "partner-individual", "partner-institutional", "admin", "customer", "expert", "teacher", "student", "finance", "hr", "school-manager"];
  if (lowerRoles.some((r) => portalRoles.includes(r))) {
    return NextResponse.next();
  }

  // Fallback: unknown role → login
  return NextResponse.redirect(new URL("/login", req.url));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|assets|images).*)"],
};
