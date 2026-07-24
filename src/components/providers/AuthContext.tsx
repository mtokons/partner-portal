"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

interface AuthContextProps {
  children: React.ReactNode;
}

/**
 * A client-side wrapper for the NextAuth SessionProvider.
 * Listens for ChunkLoadError (caused by production deployments) and reloads to fetch fresh assets.
 */
export default function AuthContext({ children }: AuthContextProps) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason || "");
      if (
        reason.includes("ChunkLoadError") ||
        reason.includes("Failed to load chunk") ||
        reason.includes("Loading chunk")
      ) {
        console.warn("New deployment detected. Reloading page to load latest chunks...");
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
