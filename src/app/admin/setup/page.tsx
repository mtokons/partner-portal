import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import SetupClient from "./SetupClient";

export const metadata = {
  title: "SCCG System Setup | Infrastructure",
  description: "Initialize core SharePoint infrastructure for the Portal.",
};

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  
  if (!roles.includes("admin")) {
    redirect("/dashboard");
  }

  return <SetupClient />;
}
