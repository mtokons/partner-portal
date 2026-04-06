import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextAuthRequest } from "next-auth";

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  const publicPaths = ["/login", "/customer-login", "/expert-login", "/register", "/forgot-password"];
  const isPublic = publicPaths.some((p) => pathname === p) || pathname.startsWith("/api/auth");

  if (isPublic) {
    if (isLoggedIn) {
      if (role === "customer" && pathname === "/customer-login")
        return NextResponse.redirect(new URL("/customer/dashboard", req.url));
      if (role === "expert" && pathname === "/expert-login")
        return NextResponse.redirect(new URL("/expert/dashboard", req.url));
      if ((role === "partner" || role === "admin") && pathname === "/login")
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/customer"))
      return NextResponse.redirect(new URL("/customer-login", req.url));
    if (pathname.startsWith("/expert"))
      return NextResponse.redirect(new URL("/expert-login", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Customer-only routes
  if (pathname.startsWith("/customer") && role !== "customer")
    return NextResponse.redirect(new URL("/customer-login", req.url));

  // Expert-only routes
  if (pathname.startsWith("/expert") && role !== "expert")
    return NextResponse.redirect(new URL("/expert-login", req.url));

  // Partner portal routes — redirect wrong roles away
  if (!pathname.startsWith("/customer") && !pathname.startsWith("/expert")) {
    if (role === "customer")
      return NextResponse.redirect(new URL("/customer/dashboard", req.url));
    if (role === "expert")
      return NextResponse.redirect(new URL("/expert/dashboard", req.url));
    // Admin-only sub-routes
    if (pathname.startsWith("/admin") && role !== "admin")
      return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
