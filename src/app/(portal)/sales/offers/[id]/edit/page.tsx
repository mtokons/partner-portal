import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOfferById, getSalesOfferItems } from "@/lib/sharepoint";
import EditOfferForm from "./EditOfferForm";

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const { id } = await params;

  const [offer, items] = await Promise.all([
    getSalesOfferById(id),
    getSalesOfferItems(id),
  ]);

  if (!offer) notFound();
  if (user.role !== "admin" && offer.partnerId !== user.partnerId) redirect("/sales/offers");

  // Only allow editing if draft or sent
  if (offer.status !== "draft" && offer.status !== "sent") {
    redirect(`/sales/offers/${id}`);
  }

  return <EditOfferForm offer={offer} initialItems={items} />;
}
