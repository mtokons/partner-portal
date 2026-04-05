"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { assignExpertToPackage } from "@/lib/sharepoint";

export async function assignExpertAction(packageId: string, expertId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  if (user.role !== "admin") throw new Error("Forbidden");

  await assignExpertToPackage(packageId, expertId);
  redirect("/admin/experts");
}
