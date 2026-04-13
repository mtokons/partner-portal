"use server";

import { signIn, signOut } from "@/auth";
import { hash } from "bcryptjs";
import { createPartner, createCustomer } from "@/lib/sharepoint";

export async function loginAction(email: string, password: string, portal?: string) {
  try {
    const credentials: Record<string, string> = { email, password };
    if (portal) credentials.portal = portal;
    await signIn("credentials", { ...credentials, redirect: false });
    return { success: true };
  } catch {
    return { success: false, error: "Invalid email or password" };
  }
}

import { AuthError } from "next-auth";

export async function firebaseAuthAction(idToken: string) {
  try {
    await signIn("credentials", { idToken, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      // Auth.js v5 wraps errors in multiple layers. Try all known paths.
      const cause = err.cause?.err as Error | undefined;
      const message = cause?.message || err.message || "Authentication failed";
      // Filter out generic "CallbackRouteError" messages
      const userMessage = message.includes("CallbackRouteError") || message.includes("CredentialsSignin")
        ? cause?.message || "Authentication failed. Your account may be pending approval."
        : message;
      return { success: false, error: userMessage };
    }
    // Handle non-AuthError throws (e.g. NEXT_REDIRECT from signIn success)
    if (err && typeof err === "object" && "digest" in err) {
      // This is a redirect — signIn actually succeeded
      return { success: true };
    }
    console.error("Firebase auth action error:", err);
    return { success: false, error: "Authentication failed" };
  }
}

export async function registerAction(name: string, email: string, password: string, company: string, role: "partner" | "customer") {
  try {
    const passwordHash = await hash(password, 10);
    if (role === "partner") {
      await createPartner({
        name,
        email,
        passwordHash,
        company,
        role: "partner",
        status: "active",
        partnerType: "individual",
        commissionTier: "standard",
        onboardingStatus: "application",
      });
    } else {
      await createCustomer({ name, email, passwordHash, company, partnerId: "", status: "active" });
    }
    // Auto login
    const portal = role === "customer" ? "customer" : undefined;
    const credentials: Record<string, string> = { email, password };
    if (portal) credentials.portal = portal;
    await signIn("credentials", { ...credentials, redirect: false });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function customerLoginAction(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, portal: "customer", redirect: false });
    return { success: true };
  } catch {
    return { success: false, error: "Invalid email or password" };
  }
}

export async function expertLoginAction(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, portal: "expert", redirect: false });
    return { success: true };
  } catch {
    return { success: false, error: "Invalid email or password" };
  }
}

export async function logoutAction() {
  await signOut({ redirect: false });
}
