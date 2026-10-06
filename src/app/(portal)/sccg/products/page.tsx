import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { getProducts } from "@/lib/sharepoint";
import AdminProductsClient from "@/app/(portal)/admin/products/AdminProductsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Products | SCCG Admin Portal",
  description: "Manage product positioning, custom logo text, pricing, and catalog display for SCCG Marketplace.",
};

export default async function SccgProductsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const role = (session.user.role || "").toLowerCase();
  const roles = (session.user.roles || [role]).map((r) => r.toLowerCase());
  if (
    !roles.includes("admin") &&
    !roles.includes("superadmin") &&
    !roles.includes("sccg-admin") &&
    !roles.includes("sccg-staff") &&
    !roles.includes("sccg")
  ) {
    redirect("/dashboard");
  }

  const products = await getProducts();

  return <AdminProductsClient initialProducts={products} />;
}
