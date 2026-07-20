import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPartnerById } from "@/lib/sharepoint";
import EditPartnerClient from "./EditPartnerClient";

export const dynamic = "force-dynamic";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const partner = await getPartnerById(id);
  if (!partner) notFound();

  return <EditPartnerClient partner={partner} />;
}
