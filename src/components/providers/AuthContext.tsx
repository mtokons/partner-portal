"use client";

import { SessionProvider } from "next-auth/react";

interface AuthContextProps {
  children: React.ReactNode;
}

/**
 * A client-side wrapper for the NextAuth SessionProvider.
 * This ensures that useSession() and other auth hooks work correctly
 * across all client components in the App Router.
 */
export default function AuthContext({ children }: AuthContextProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
