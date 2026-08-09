import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";
import { decodeImpersonationToken } from "@/lib/impersonation";
import { getPolicyForPath, resolveDashboardForRoles, normalizeRoles } from "@/lib/access-policy";

/**
 * Console-to-role mapping.
 * Each console path requires the user to hold at least one of the listed roles.
 */
function resolveDefaultConsole(roles: string[]): string {
  return resolveDashboardForRoles(roles) || "/access-denied";
}

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;
  const roles = normalizeRoles(((req.auth?.user as { roles?: string[] } | undefined)?.roles || [role]).filter(Boolean) as string[]);

  // --- Read impersonation cookie for active View-As sessions ---
  const impersonateRaw = req.cookies.get("__sccg_impersonate")?.value;
  const impersonation = impersonateRaw ? decodeImpersonationToken(impersonateRaw) : null;
  // When impersonation is active, use target roles for route-access decisions (admin is still logged in)
  const effectiveRoles = impersonation ? impersonation.targetRoles : roles;

  // --- Dedicated demo flow ---
  if (pathname === "/demo" || pathname === "/demo/login") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/demo/")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/demo/login", req.url));
    }
    return NextResponse.next();
  }

  // --- Public paths: no auth required ---
  const publicPaths = ["/login", "/customer-login", "/expert-login", "/register", "/forgot-password", "/erp-experience", "/access-denied", "/demo", "/demo/login"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/livez") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/offer-response");

  if (isPublic) {
    // If already logged in, redirect away from login pages UNLESS explicitly switching accounts
    if (isLoggedIn) {
      const isSwitching = req.nextUrl.searchParams.has("switch") || req.nextUrl.searchParams.has("logout");
      if (!isSwitching && (pathname === "/login" || pathname === "/customer-login" || pathname === "/expert-login")) {
        return NextResponse.redirect(new URL(resolveDefaultConsole(effectiveRoles), req.url));
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

  // --- Direct /dashboard request: redirect non-admin roles to their specific console ---
  if (pathname === "/dashboard") {
    const isRealAdmin = roles.map(r => r.toLowerCase()).some(r => ["admin", "project-admin"].includes(r));
    if (!isRealAdmin) {
      return NextResponse.redirect(new URL(resolveDefaultConsole(effectiveRoles), req.url));
    }
  }

  // --- Console-based access control ---
  const routePolicy = getPolicyForPath(pathname);
  if (routePolicy) {
    const lowerRoles = effectiveRoles.map((r) => r.toLowerCase());
    const isRealAdmin = roles.some((r) => ["admin", "project-admin"].includes(r));
    const hasAccess = routePolicy.roles.some((requiredRole) => lowerRoles.includes(requiredRole)) || isRealAdmin;
    if (!hasAccess) {
      const target = resolveDefaultConsole(effectiveRoles);
      return target === pathname
        ? NextResponse.redirect(new URL("/access-denied", req.url))
        : NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // --- Shared pages (dashboard, shop, profile, etc.) ---
  const portalRoles = ["partner", "partner-individual", "partner-institutional", "admin", "sccg-admin", "sccg-staff", "customer", "expert", "teacher", "student", "finance", "hr", "school-manager", "project-partner", "project-partner-admin"];
  if (effectiveRoles.map(r => r.toLowerCase()).some((r) => portalRoles.includes(r))) {
    return NextResponse.next();
  }

  // Fallback: unknown role → login
  return NextResponse.redirect(new URL("/login", req.url));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|assets|images).*)"],
};
