"use server";

import { signIn, signOut } from "@/auth";

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
