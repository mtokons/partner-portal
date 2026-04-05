import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getPartnerByEmail, getCustomerByEmail, getExpertByEmail } from "@/lib/sharepoint";
import type { SessionUser } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Portal Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Identifies which portal is making the request
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
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
