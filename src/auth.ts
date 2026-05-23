/**
 * NextAuth v5 Configuration — Firebase-only authentication.
 *
 * Single auth source: Firebase Auth + Firestore user profiles.
 * No more triple-store lookup across SharePoint Partners/Customers/Experts.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyIdToken, getDb } from "@/lib/db/firestore";
import type { SessionUser, UserRole } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Firebase Login",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;

        try {
          const decoded = await verifyIdToken(credentials.idToken as string);
          if (!decoded?.email) return null;

          // Look up user profile in Firestore
          const profileDoc = await getDb().collection("users").doc(decoded.uid).get();
          const profile = profileDoc.data() as {
            role?: UserRole;
            roles?: UserRole[];
            displayName?: string;
            company?: string;
            partnerId?: string;
            status?: string;
          } | undefined;

          // Block pending/suspended users
          if (profile?.status === "pending" || profile?.status === "suspended") {
            return null;
          }

          const role: UserRole = profile?.role || "partner";
          const roles: UserRole[] = profile?.roles || [role];

          return {
            id: decoded.uid,
            name: profile?.displayName || decoded.name || decoded.email.split("@")[0],
            email: decoded.email,
            role,
            roles,
            partnerId: profile?.partnerId || "",
            company: profile?.company || "",
          } satisfies SessionUser;
        } catch (error) {
          console.error("[auth] Firebase login failed:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.role = u.role;
        token.roles = u.roles;
        token.partnerId = u.partnerId;
        token.company = u.company;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as SessionUser;
        u.id = token.sub as string;
        u.role = token.role as UserRole;
        u.roles = (token.roles as UserRole[]) || [token.role as string];
        u.partnerId = token.partnerId as string;
        u.company = token.company as string;
      }
      return session;
    },
  },
});
