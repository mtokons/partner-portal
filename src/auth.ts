import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPartnerByEmail, getCustomerByEmail, getExpertByEmail } from "@/lib/sharepoint";
import { verifyIdToken } from "@/lib/firebase-admin";
import type { SessionUser } from "@/types";
import type { FirebaseUserProfile } from "@/lib/firebase-auth";
import { getFirestoreDb } from "@/lib/firebase-auth";
import { doc, getDoc } from "firebase/firestore";

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
            if (!decodedToken) return null;

            // 1. Check for Cloud/Firebase Profile Status
            const db = getFirestoreDb();
            const profileDoc = await getDoc(doc(db, "users", decodedToken.uid));
            const profile = profileDoc.data() as FirebaseUserProfile | undefined;

            if (profile) {
              if (profile.status === "pending") {
                throw new Error("Your account is pending admin approval.");
              }
              if (profile.status === "suspended") {
                throw new Error("Your account has been suspended.");
              }
            }

            // 2. Map to Portal Roles (Bridging Firebase and SharePoint)
            const email = decodedToken.email || "";
            
            const partner = await getPartnerByEmail(email);
            if (partner) {
              // Legacy status check for SharePoint stores
              if (partner.status === "suspended") throw new Error("Partner account suspended.");
              
              return { 
                id: decodedToken.uid, 
                name: partner.name, 
                email: partner.email, 
                role: "partner", 
                partnerId: partner.id,
                company: partner.company,
              } as SessionUser;
            }

            const customer = await getCustomerByEmail(email);
            if (customer) {
              if (customer.status === "suspended") throw new Error("Customer account suspended.");
              
              return {
                id: decodedToken.uid,
                name: customer.name,
                email: customer.email,
                role: "customer",
                partnerId: customer.partnerId,
                company: customer.company || "",
                customerId: customer.id,
              } as SessionUser;
            }

            // Fallback for new/social users
            return {
              id: decodedToken.uid,
              name: decodedToken.name || profile?.displayName || email.split("@")[0],
              email: email,
              role: profile?.role || "customer",
              partnerId: "",
            } as SessionUser;
          } catch (error) {
            console.error("Firebase token verification failed:", error);
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
          const customer = await getCustomerByEmail(email);
          if (!customer || customer.status === "suspended") return null;
          const isValid = await compare(password, customer.passwordHash);
          if (!isValid) return null;
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            role: "customer",
            partnerId: customer.partnerId,
            company: customer.company || "",
            customerId: customer.id,
          } as SessionUser;
        }

        if (portal === "expert") {
          const expert = await getExpertByEmail(email);
          if (!expert || expert.status === "inactive") return null;
          const isValid = await compare(password, expert.passwordHash);
          if (!isValid) return null;
          return {
            id: expert.id,
            name: expert.name,
            email: expert.email,
            role: "expert",
            partnerId: "",
            company: expert.specialization,
            expertId: expert.id,
          } as SessionUser;
        }

        // No portal specified: try to find user across partner/customer/expert stores
        const partner = await getPartnerByEmail(email);
        if (partner) {
          if (partner.status === "suspended") return null;
          const isValid = await compare(password, partner.passwordHash);
          if (!isValid) return null;
          return {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            role: partner.role,
            partnerId: partner.id,
            company: partner.company,
          } as SessionUser;
        }

        const customer = await getCustomerByEmail(email);
        if (customer && customer.status !== "suspended") {
          const isValid = await compare(password, customer.passwordHash);
          if (!isValid) return null;
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            role: "customer",
            partnerId: customer.partnerId,
            company: customer.company || "",
            customerId: customer.id,
          } as SessionUser;
        }

        const expert = await getExpertByEmail(email);
        if (expert && expert.status !== "inactive") {
          const isValid = await compare(password, expert.passwordHash);
          if (!isValid) return null;
          return {
            id: expert.id,
            name: expert.name,
            email: expert.email,
            role: "expert",
            partnerId: "",
            company: expert.specialization,
            expertId: expert.id,
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
        token.partnerId = u.partnerId;
        token.company = u.company;
        token.customerId = u.customerId;
        token.expertId = u.expertId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as SessionUser;
        u.role = token.role as SessionUser["role"];
        u.partnerId = token.partnerId as string;
        u.company = token.company as string;
        u.id = token.sub as string;
        u.customerId = token.customerId as string | undefined;
        u.expertId = token.expertId as string | undefined;
      }
      return session;
    },
  },
});
