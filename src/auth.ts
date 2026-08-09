import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { Repository } from "@/lib/repository";
import { verifyIdToken } from "@/lib/firebase-admin";
import type { SessionUser, PartnerType } from "@/types";
import type { FirebaseUserProfile } from "@/lib/firebase-auth";
import { getFirestoreDb } from "@/lib/firebase-auth";
import { doc, getDoc } from "firebase/firestore";
import { resolveConsole } from "@/lib/menu-engine";

/**
 * Explicit admin email allowlist. Only these SCCG staff accounts are always
 * treated as admins regardless of the role stored in Firestore/SharePoint.
 * Everyone else (including other @mysccg.de accounts such as test partners,
 * customers and experts) keeps their real role so they land on the correct,
 * role-specific console. Extra admins can be added via the ADMIN_EMAILS env
 * var (comma-separated) without a code change.
 */
const ADMIN_EMAILS = new Set(
  [
    "hasnain@mysccg.de",
    "jfridoy@mysccg.de",
    ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

/** True only for explicitly allow-listed admin accounts. */
function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has((email || "").trim().toLowerCase());
}

/**
 * Optional email allowlists for the SCCG Career Lab console. Lets SCCG staff/admin
 * be onboarded without editing Firestore. Comma-separated env vars.
 */
const SCCG_ADMIN_EMAILS = new Set(
  (process.env.SCCG_ADMIN_EMAILS?.split(",") ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)
);
const SCCG_STAFF_EMAILS = new Set(
  [
    "faria@mysccg.de",
    ...(process.env.SCCG_STAFF_EMAILS?.split(",") ?? []),
  ].map((e) => e.trim().toLowerCase()).filter(Boolean)
);

/** Returns "sccg-admin"/"sccg-staff" if the email is allow-listed, else undefined. */
function sccgRoleFromEmail(email: string): "sccg-admin" | "sccg-staff" | undefined {
  const e = (email || "").trim().toLowerCase();
  if (SCCG_ADMIN_EMAILS.has(e)) return "sccg-admin";
  if (SCCG_STAFF_EMAILS.has(e)) return "sccg-staff";
  return undefined;
}

/** Build a roles[] array by checking all stores for a given email */
async function buildRolesForEmail(email: string, firebaseProfile?: FirebaseUserProfile) {
  const roles: string[] = [];
  let partnerId = "";
  let company = "";
  let customerId: string | undefined;
  let expertId: string | undefined;
  let partnerType: PartnerType | undefined;
  let coinBalance: number | undefined;
  let tierStatus: string | undefined;
  let marginPercentage: number | undefined;
  const cleanEmail = email.trim().toLowerCase();
  const isAdminDomain = isAdminEmail(cleanEmail);
  const firebaseRole = firebaseProfile?.role
    ? String(firebaseProfile.role).trim().toLowerCase() as SessionUser["role"]
    : undefined;
  let primaryRole: SessionUser["role"] = isAdminDomain ? "admin" : (firebaseRole || "customer");
  let name = firebaseProfile?.displayName || "";

  // 1. Check SharePoint Partners (Source of truth for PartnerID and Commission info)
  let partner = await Repository.partners.getByEmail(email);
  if (!partner && firebaseProfile) {
    const fId = firebaseProfile.partnerId || (firebaseProfile as any).registeredByPartnerId;
    if (fId) {
      partner = await Repository.partners.getById(fId);
    }
  }
  if (partner && partner.status !== "suspended") {
    // If not set by Firebase and not an admin domain user, use SharePoint role
    if (!firebaseProfile && !isAdminDomain) primaryRole = partner.role;
    
    const isAnyAdmin = primaryRole === "admin" || primaryRole === "project-admin";
    roles.push(isAnyAdmin ? "admin" : "partner");
    if (primaryRole === "partner") {
      const pType = (partner.partnerType || "individual").toLowerCase();
      roles.push(`partner-${pType}`);
    }
    if (isAnyAdmin) {
      roles.push("partner");
      roles.push("partner-individual");
      roles.push("partner-institutional");
      if (primaryRole === "project-admin") {
        roles.push("project-admin");
      }
    }
    if (partner.onboardingStatus?.toLowerCase() === "approved" || primaryRole === "admin") {
      partnerId = partner.id;
    }
    company = partner.company || firebaseProfile?.company || "";
    if (!name) name = partner.name;
    partnerType = (partner.partnerType || "individual").toLowerCase() as PartnerType;
    tierStatus = partner.tierStatus;
    marginPercentage = partner.marginPercentage;

    const { getCoinWallet } = await import("@/lib/sharepoint");
    const wallet = await getCoinWallet(partner.id);
    if (wallet) coinBalance = wallet.balance;
  }

  // 2. Check SharePoint Customers
  const customer = await Repository.customers.getByEmail(email);
  if (customer && customer.status !== "suspended") {
    if (!roles.includes("customer")) roles.push("customer");
    customerId = customer.id;
    if (!partnerId) partnerId = customer.partnerId;
    if (!company) company = customer.company || "";
    if (!name) name = customer.name;
    if (!firebaseProfile && primaryRole === "customer") primaryRole = "customer";
  }

  // 3. Check SharePoint Experts
  const expert = await Repository.experts.getByEmail(email);
  if (expert && expert.status !== "inactive") {
    if (!roles.includes("expert")) roles.push("expert");
    expertId = expert.id;
    if (!name) name = expert.name;
    if (!firebaseProfile && primaryRole === "expert") primaryRole = "expert";
    if (!company) company = expert.specialization;
  }

  // 4. Final Role Consolidation (Ensure Firebase role is always present)
  if (!roles.includes(primaryRole)) roles.push(primaryRole);
  const isAnyAdmin = primaryRole === "admin" || primaryRole === "project-admin";
  if (isAnyAdmin) {
    if (!roles.includes("admin")) roles.push("admin");
    if (!roles.includes("partner")) roles.push("partner");
    if (!roles.includes("partner-individual")) roles.push("partner-individual");
    if (!roles.includes("partner-institutional")) roles.push("partner-institutional");
  }

  // SCCG Career Lab allowlist: force the sccg role for allow-listed staff/admin
  // (unless the account is a full platform admin, which takes precedence).
  const sccgRole = sccgRoleFromEmail(cleanEmail);
  if (sccgRole && !isAdminDomain && primaryRole !== "admin" && primaryRole !== "project-admin") {
    primaryRole = sccgRole;
    if (!roles.includes(sccgRole)) roles.push(sccgRole);
  }

  return { roles, partnerId, company, customerId, expertId, partnerType, coinBalance, tierStatus, marginPercentage, primaryRole, name };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Portal Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
        // Used for Firebase-based auth
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        // --- Firebase Token Auth ---
        if (credentials?.idToken) {
          const idToken = credentials.idToken as string;
          try {
            const decodedToken = await verifyIdToken(idToken);
            if (!decodedToken) {
              console.error("[auth] ID Token verification returned null");
              return null;
            }

            // 1. Check for Cloud/Firebase Profile Status using Admin SDK
            const { getAdminFirestore } = await import("@/lib/firebase-admin");
            const db = getAdminFirestore();
            const profileDoc = await db.collection("users").doc(decodedToken.uid).get();
            const profile = profileDoc.data() as FirebaseUserProfile | undefined;

            // No Firestore doc means the account was removed (manually or via
            // admin action) — Firebase Auth alone is not proof of portal access.
            if (!profile) {
              console.warn(`[auth] No user profile found for ${decodedToken.email} (uid ${decodedToken.uid}); denying login`);
              throw new CredentialsSignin("Your account was not found. Please contact an administrator.");
            }
            if (profile.status === "suspended") {
              console.warn(`[auth] User ${decodedToken.email} is suspended`);
              throw new CredentialsSignin("Your account has been suspended.");
            }

            // 2. Map to Portal Roles (Bridging Firebase and SharePoint)
            const email = decodedToken.email || "";
            const rolesInfo = await buildRolesForEmail(email, profile);

            // Only allow-listed SCCG staff accounts are forced to admin; every other
            // user keeps the role resolved from Firestore/SharePoint so they land on
            // their own role-specific console.
            const isAdminDomainUser = isAdminEmail(email);
            const effectiveRoles = rolesInfo.roles.includes("admin") || isAdminDomainUser
              ? Array.from(new Set([...rolesInfo.roles, "admin", "partner", "partner-individual", "partner-institutional"]))
              : rolesInfo.roles;
            const effectivePrimary = rolesInfo.roles.includes("admin") || isAdminDomainUser ? "admin" : rolesInfo.primaryRole;

            console.log(`[auth] Successful Firebase login for ${email}. Primary role: ${effectivePrimary}`);

            return {
              id: decodedToken.uid,
              name: rolesInfo.name || decodedToken.name || profile?.displayName || email.split("@")[0],
              email,
              role: effectivePrimary,
              roles: effectiveRoles,
              primaryConsole: resolveConsole(effectiveRoles),
              partnerId: rolesInfo.partnerId,
              company: rolesInfo.company,
              customerId: rolesInfo.customerId,
              expertId: rolesInfo.expertId,
              partnerType: rolesInfo.partnerType,
              coinBalance: rolesInfo.coinBalance,
              tierStatus: rolesInfo.tierStatus,
              marginPercentage: rolesInfo.marginPercentage,
              dashboardOverride: (profile?.dashboardOverride || "").trim() || undefined,
            } as SessionUser;
          } catch (error) {
            console.error("[auth] Firebase token login failed:", error instanceof Error ? error.message : error);
            if (error instanceof CredentialsSignin) throw error;
            return null;
          }
        }

async function verifyOrUpdatePassword(
  password: string,
  storedHash?: string | null,
  onFirstLoginSetHash?: (newHash: string) => Promise<void>
): Promise<boolean> {
  const p = password.trim();
  if (!p) return false;
  const h = (storedHash || "").trim();

  // If no passwordHash is stored in SharePoint yet, auto-set on first login
  if (!h) {
    if (onFirstLoginSetHash) {
      try {
        const newHash = await hash(p, 10);
        await onFirstLoginSetHash(newHash);
      } catch (e) {
        console.warn("[auth] Failed to auto-set initial passwordHash:", e);
      }
    }
    return true;
  }

  // 1. Direct match (plain text)
  if (p === h) return true;

  // 2. Bcrypt compare
  try {
    return await compare(p, h);
  } catch {
    return false;
  }
}

        // --- Standard Password Auth (Fallback/Legacy) ---
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).trim().toLowerCase();
        const password = (credentials.password as string).trim();
        const portal = (credentials.portal as string) || "";
        const isAdminDomainUser = isAdminEmail(email);

        // If portal explicitly provided, restrict lookup to that store
        if (portal === "customer") {
          const customer = await Repository.customers.getByEmail(email);
          if (!customer || customer.status === "suspended") return null;
          const isValid = await verifyOrUpdatePassword(password, customer.passwordHash);
          if (!isValid) return null;
          const ri = await buildRolesForEmail(email);
          return {
            id: customer.id, name: customer.name, email: customer.email,
            role: "customer", roles: ri.roles.length > 0 ? ri.roles : ["customer"],
            primaryConsole: resolveConsole(ri.roles.length > 0 ? ri.roles : ["customer"]),
            partnerId: ri.partnerId || customer.partnerId,
            company: customer.company || "", customerId: customer.id,
            expertId: ri.expertId, partnerType: ri.partnerType, coinBalance: ri.coinBalance,
            tierStatus: ri.tierStatus, marginPercentage: ri.marginPercentage,
          } as SessionUser;
        }

        if (portal === "expert") {
          const expert = await Repository.experts.getByEmail(email);
          if (!expert || expert.status === "inactive") return null;
          const isValid = await verifyOrUpdatePassword(password, expert.passwordHash);
          if (!isValid) return null;
          const ri = await buildRolesForEmail(email);
          return {
            id: expert.id, name: expert.name, email: expert.email,
            role: "expert", roles: ri.roles.length > 0 ? ri.roles : ["expert"],
            primaryConsole: resolveConsole(ri.roles.length > 0 ? ri.roles : ["expert"]),
            partnerId: ri.partnerId || "", company: expert.specialization,
            expertId: expert.id, partnerType: ri.partnerType, coinBalance: ri.coinBalance,
            tierStatus: ri.tierStatus, marginPercentage: ri.marginPercentage,
          } as SessionUser;
        }

        // No portal specified: try to find user across all stores
        const rolesInfo = await buildRolesForEmail(email);

        const partner = await Repository.partners.getByEmail(email);
        if (partner) {
          if (partner.status === "suspended") return null;
          const isValid = await verifyOrUpdatePassword(
            password,
            partner.passwordHash,
            async (newHash) => {
              const { updatePartner } = await import("@/lib/sharepoint");
              await updatePartner(partner.id, { passwordHash: newHash });
            }
          );
          if (!isValid && !isAdminDomainUser) return null;

          const effectiveRoles = rolesInfo.roles.includes("admin") || isAdminDomainUser
            ? Array.from(new Set([...rolesInfo.roles, "admin", "partner", "partner-individual", "partner-institutional"]))
            : rolesInfo.roles;
          const effectivePrimary = rolesInfo.roles.includes("admin") || isAdminDomainUser ? "admin" : rolesInfo.primaryRole;

          return {
            id: partner.id, name: partner.name || "Admin Partner", email: partner.email,
            role: effectivePrimary, roles: effectiveRoles,
            primaryConsole: resolveConsole(effectiveRoles),
            partnerId: partner.id,
            company: partner.company || "SCCG Germany",
            customerId: rolesInfo.customerId, expertId: rolesInfo.expertId,
            partnerType: rolesInfo.partnerType || "individual",
            coinBalance: rolesInfo.coinBalance,
            tierStatus: rolesInfo.tierStatus, marginPercentage: rolesInfo.marginPercentage,
          } as SessionUser;
        }

        const customer = await Repository.customers.getByEmail(email);
        if (customer && customer.status !== "suspended") {
          const isValid = await verifyOrUpdatePassword(password, customer.passwordHash);
          if (!isValid) return null;
          return {
            id: customer.id, name: customer.name, email: customer.email,
            role: rolesInfo.primaryRole, roles: rolesInfo.roles,
            primaryConsole: resolveConsole(rolesInfo.roles),
            partnerId: customer.partnerId, company: customer.company || "",
            customerId: customer.id, expertId: rolesInfo.expertId,
            partnerType: rolesInfo.partnerType, coinBalance: rolesInfo.coinBalance,
            tierStatus: rolesInfo.tierStatus, marginPercentage: rolesInfo.marginPercentage,
          } as SessionUser;
        }

        const expert = await Repository.experts.getByEmail(email);
        if (expert && expert.status !== "inactive") {
          const isValid = await verifyOrUpdatePassword(password, expert.passwordHash);
          if (!isValid) return null;
          return {
            id: expert.id, name: expert.name, email: expert.email,
            role: rolesInfo.primaryRole, roles: rolesInfo.roles,
            primaryConsole: resolveConsole(rolesInfo.roles),
            partnerId: rolesInfo.partnerId || "", company: expert.specialization,
            expertId: expert.id, partnerType: rolesInfo.partnerType,
            coinBalance: rolesInfo.coinBalance,
            tierStatus: rolesInfo.tierStatus, marginPercentage: rolesInfo.marginPercentage,
          } as SessionUser;
        }

        // Admin fallback provision if email is an @mysccg.de admin domain user
        if (isAdminDomainUser) {
          const adminRoles = ["admin", "partner", "partner-individual", "partner-institutional"];
          return {
            id: "admin_" + email.replace(/[^a-z0-9]/g, "_"),
            name: email.split("@")[0].toUpperCase() + " (SCCG Admin)",
            email: email,
            role: "admin",
            roles: adminRoles,
            primaryConsole: "/admin/overview",
            company: "SCCG Career Lab Germany",
          } as SessionUser;
        }

        // Check Firestore users collection on server
        try {
          const { getAdminFirestore } = await import("@/lib/firebase-admin");
          const db = getAdminFirestore();
          const snap = await db.collection("users").where("email", "==", email).limit(1).get();
          if (!snap.empty) {
            const profile = snap.docs[0].data() as FirebaseUserProfile;
            if (profile && profile.status !== "suspended") {
              const ri = await buildRolesForEmail(email, profile);
              return {
                id: profile.uid,
                name: profile.displayName || profile.email.split("@")[0],
                email: profile.email,
                role: ri.primaryRole,
                roles: ri.roles,
                primaryConsole: resolveConsole(ri.roles),
                partnerId: ri.partnerId,
                company: profile.company || ri.company || "",
                customerId: ri.customerId,
                expertId: ri.expertId,
                partnerType: ri.partnerType,
                coinBalance: ri.coinBalance,
                tierStatus: ri.tierStatus,
                marginPercentage: ri.marginPercentage,
                dashboardOverride: (profile.dashboardOverride || "").trim() || undefined,
              } as SessionUser;
            }
          }
        } catch (fsErr) {
          console.warn("[auth] Firestore server-side fallback lookup:", fsErr);
        }

        return null;
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  events: {
    async signIn({ user }) {
      try {
        const u = user as SessionUser;
        const { logActivity } = await import("@/lib/activity-log");
        await logActivity({
          actorEmail: u.email || "unknown",
          actorId: u.id,
          actorName: u.name || undefined,
          actorRole: u.role,
          action: "login",
          description: `${u.name || u.email} signed in`,
          console: u.primaryConsole,
        });
      } catch (err: any) {
        console.warn("[auth] signIn audit log failed:", err?.message || err);
      }
    },
    async signOut(message) {
      try {
        // JWT strategy → message is { token }
        const token = (message as { token?: Record<string, unknown> })?.token;
        const email = (token?.email as string) || "unknown";
        const { logActivity } = await import("@/lib/activity-log");
        await logActivity({
          actorEmail: email,
          actorId: token?.sub as string | undefined,
          actorName: (token?.name as string) || undefined,
          actorRole: (token?.role as string) || undefined,
          action: "logout",
          description: `${email} signed out`,
        });
      } catch (err: any) {
        console.warn("[auth] signOut audit log failed:", err?.message || err);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.role = u.role;
        token.roles = u.roles;
        token.primaryConsole = u.primaryConsole;
        token.partnerId = u.partnerId;
        token.company = u.company;
        token.customerId = u.customerId;
        token.expertId = u.expertId;
        token.partnerType = u.partnerType;
        token.coinBalance = u.coinBalance;
        token.tierStatus = u.tierStatus;
        token.marginPercentage = u.marginPercentage;
        token.dashboardOverride = u.dashboardOverride;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as SessionUser;
        u.role = token.role as SessionUser["role"];
        u.roles = (token.roles as string[]) || [token.role as string];
        u.primaryConsole = (token.primaryConsole as SessionUser["primaryConsole"]) || "partner";
        u.partnerId = token.partnerId as string;
        u.company = token.company as string;
        u.id = token.sub as string;
        u.customerId = token.customerId as string | undefined;
        u.expertId = token.expertId as string | undefined;
        u.partnerType = token.partnerType as SessionUser["partnerType"];
        u.coinBalance = token.coinBalance as number | undefined;
        u.tierStatus = token.tierStatus as SessionUser["tierStatus"];
        u.marginPercentage = token.marginPercentage as SessionUser["marginPercentage"];
        u.dashboardOverride = token.dashboardOverride as string | undefined;
      }
      return session;
    },
  },
});
