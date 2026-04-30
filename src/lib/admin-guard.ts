import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

/** Returns the SessionUser if the caller has the admin role, otherwise redirects. */
export async function requireAdmin(redirectTo: string = "/login"): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");
  return user;
}

/** Throws if the caller is not admin (use inside server actions instead of redirect). */
export async function assertAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) {
    throw new Error("FORBIDDEN: admin role required");
  }
  return user;
}
