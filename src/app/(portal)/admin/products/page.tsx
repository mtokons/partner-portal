import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/sharepoint";
import AdminProductsClient from "./AdminProductsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Product Management & Positioning | SCCG Admin Portal",
  description: "Manage product positioning, custom logo text, pricing, and catalog display for SCCG Marketplace.",
};

export default async function AdminProductsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const role = (session.user.role || "").toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    redirect("/dashboard");
  }

  const products = await getProducts();

  return <AdminProductsClient initialProducts={products} />;
}
