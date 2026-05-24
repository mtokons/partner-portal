import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import type { SessionUser } from "@/types";
import { getProducts } from "@/lib/sharepoint";
import ProductEditForm from "./ProductEditForm";

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return <ProductEditForm product={product} />;
}
