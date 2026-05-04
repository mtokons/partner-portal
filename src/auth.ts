import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Repository } from "@/lib/repository";
import { verifyIdToken } from "@/lib/firebase-admin";
import type { SessionUser, PartnerType } from "@/types";
import type { FirebaseUserProfile } from "@/lib/firebase-auth";
import { getFirestoreDb } from "@/lib/firebase-auth";
import { doc, getDoc } from "firebase/firestore";

/** Build a roles[] array by checking all stores for a given email */
async function buildRolesForEmail(email: string, firebaseProfile?: FirebaseUserProfile) {
  const roles: string[] = [];
  let partnerId = "";
  let company = "";
  let customerId: string | undefined;
  let expertId: string | undefined;
  let partnerType: PartnerType | undefined;
  let coinBalance: number | undefined;
  let primaryRole: SessionUser["role"] = firebaseProfile?.role || "customer";
  let name = firebaseProfile?.displayName || "";

  // 1. Check SharePoint Partners (Source of truth for PartnerID and Commission info)
  const partner = await Repository.partners.getByEmail(email);
  if (partner && partner.status !== "suspended") {
    // If not set by Firebase, use SharePoint role
    if (!firebaseProfile) primaryRole = partner.role;
    
    roles.push(primaryRole === "admin" ? "admin" : "partner");
    if (primaryRole === "partner") {
      roles.push(`partner-${partner.partnerType}`);
    }
    if (primaryRole === "admin") {
      roles.push("partner");
      roles.push("partner-individual");
      roles.push("partner-institutional");
    }
    partnerId = partner.id;
    company = partner.company || firebaseProfile?.company || "";
    if (!name) name = partner.name;
    partnerType = partner.partnerType;

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
  if (primaryRole === "admin" && !roles.includes("partner")) roles.push("partner");

  return { roles, partnerId, company, customerId, expertId, partnerType, coinBalance, primaryRole, name };
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

            if (profile) {
              if (profile.status === "pending") {
                console.warn(`[auth] User ${decodedToken.email} is pending approval`);
                const err = new CredentialsSignin("Your account is pending admin approval.");
                throw err;
              }
              if (profile.status === "suspended") {
                console.warn(`[auth] User ${decodedToken.email} is suspended`);
                const err = new CredentialsSignin("Your account has been suspended.");
                throw err;
              }
            }

            // 2. Map to Portal Roles (Bridging Firebase and SharePoint)
            const email = decodedToken.email || "";
            const rolesInfo = await buildRolesForEmail(email, profile);

            console.log(`[auth] Successful Firebase login for ${email}. Primary role: ${rolesInfo.primaryRole}`);

            return {
              id: decodedToken.uid,
              name: rolesInfo.name || decodedToken.name || profile?.displayName || email.split("@")[0],
              email,
              role: rolesInfo.primaryRole,
              roles: rolesInfo.roles,
              partnerId: rolesInfo.partnerId,
              company: rolesInfo.company,
              customerId: rolesInfo.customerId,
              expertId: rolesInfo.expertId,
              partnerType: rolesInfo.partnerType,
              coinBalance: rolesInfo.coinBalance,
            } as SessionUser;
          } catch (error) {
            console.error("[auth] Firebase token login failed:", error instanceof Error ? error.message : error);
            if (error instanceof CredentialsSignin) throw error;
            return null;
          }
        }

        // --- Standard Password Auth (Fallback/Legacy) ---
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;
        const portal = (credentials.portal as string) || "";

        // If portal explicitly provided, restrict lookup to that store
        if (portal === "customer") {
          const customer = await Repository.customers.getByEmail(email);
          if (!customer || customer.status === "suspended") return null;
          const isValid = customer.passwordHash ? await compare(password, customer.passwordHash) : false;
          if (!isValid) return null;
          const ri = await buildRolesForEmail(email);
          return {
            id: customer.id, name: customer.name, email: customer.email,
            role: "customer", roles: ri.roles.length > 0 ? ri.roles : ["customer"],
            partnerId: ri.partnerId || customer.partnerId,
            company: customer.company || "", customerId: customer.id,
            expertId: ri.expertId, partnerType: ri.partnerType, coinBalance: ri.coinBalance,
          } as SessionUser;
        }

        if (portal === "expert") {
          const expert = await Repository.experts.getByEmail(email);
          if (!expert || expert.status === "inactive" || !expert.passwordHash) return null;
          const isValid = await compare(password, expert.passwordHash);
          if (!isValid) return null;
          const ri = await buildRolesForEmail(email);
          return {
            id: expert.id, name: expert.name, email: expert.email,
            role: "expert", roles: ri.roles.length > 0 ? ri.roles : ["expert"],
            partnerId: ri.partnerId || "", company: expert.specialization,
            expertId: expert.id, partnerType: ri.partnerType, coinBalance: ri.coinBalance,
          } as SessionUser;
        }

        // No portal specified: try to find user across all stores
        const rolesInfo = await buildRolesForEmail(email);

        const partner = await Repository.partners.getByEmail(email);
        if (partner) {
          if (partner.status === "suspended") return null;
          const isValid = await compare(password, partner.passwordHash);
          if (!isValid) return null;
          return {
            id: partner.id, name: partner.name, email: partner.email,
            role: rolesInfo.primaryRole, roles: rolesInfo.roles,
            partnerId: partner.id, company: partner.company,
            customerId: rolesInfo.customerId, expertId: rolesInfo.expertId,
            partnerType: rolesInfo.partnerType, coinBalance: rolesInfo.coinBalance,
          } as SessionUser;
        }

        const customer = await Repository.customers.getByEmail(email);
        if (customer && customer.status !== "suspended") {
          const isValid = customer.passwordHash ? await compare(password, customer.passwordHash) : false;
          if (!isValid) return null;
          return {
            id: customer.id, name: customer.name, email: customer.email,
            role: rolesInfo.primaryRole, roles: rolesInfo.roles,
            partnerId: customer.partnerId, company: customer.company || "",
            customerId: customer.id, expertId: rolesInfo.expertId,
            partnerType: rolesInfo.partnerType, coinBalance: rolesInfo.coinBalance,
          } as SessionUser;
        }

        const expert = await Repository.experts.getByEmail(email);
        if (expert && expert.status !== "inactive" && expert.passwordHash) {
          const isValid = await compare(password, expert.passwordHash);
          if (!isValid) return null;
          return {
            id: expert.id, name: expert.name, email: expert.email,
            role: rolesInfo.primaryRole, roles: rolesInfo.roles,
            partnerId: rolesInfo.partnerId || "", company: expert.specialization,
            expertId: expert.id, partnerType: rolesInfo.partnerType,
            coinBalance: rolesInfo.coinBalance,
          } as SessionUser;
        }

        return null;
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
        token.customerId = u.customerId;
        token.expertId = u.expertId;
        token.partnerType = u.partnerType;
        token.coinBalance = u.coinBalance;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as SessionUser;
        u.role = token.role as SessionUser["role"];
        u.roles = (token.roles as string[]) || [token.role as string];
        u.partnerId = token.partnerId as string;
        u.company = token.company as string;
        u.id = token.sub as string;
        u.customerId = token.customerId as string | undefined;
        u.expertId = token.expertId as string | undefined;
        u.partnerType = token.partnerType as SessionUser["partnerType"];
        u.coinBalance = token.coinBalance as number | undefined;
      }
      return session;
    },
  },
});
