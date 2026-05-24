import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getClientById } from "@/lib/sharepoint";
import EditClientForm from "./EditClientForm";
import { SessionUser } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  // Check permission: Partners can only edit their own clients
  if (user.role === "partner" && client.partnerId && client.partnerId !== user.partnerId) {
    redirect("/clients");
  }

  return (
    <div className="page-enter py-10">
      <EditClientForm client={client} />
    </div>
  );
}
