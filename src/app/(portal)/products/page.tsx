import { auth } from "@/auth";
import { getProducts } from "@/lib/db/repositories/products";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { PlusIcon, PackageIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Products & Services" };

export default async function ProductsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles?.includes("admin") || user.role === "admin";
  const products = await getProducts();

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Products & Services</h1>
          <p className="page-subtitle">
            Catalog of all available products, services, and pricing.
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusIcon size={16} /> Add Product
          </button>
        )}
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-default)" }}>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Product Name</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Category</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Base Price</th>
              <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
              {isAdmin && <th style={{ padding: "1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <PackageIcon size={32} style={{ color: "var(--border-strong)" }} />
                    <p>No products available yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} style={{ borderBottom: "1px solid var(--border-default)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-default)" }}>
                    {product.name}
                    {product.description && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 400 }}>
                        {product.description.substring(0, 50)}{product.description.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                    {product.category && product.category.length > 0 ? product.category.join(", ") : "General"}
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 500 }}>
                    ৳{(product.price || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: product.isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: product.isAvailable ? "var(--accent-emerald)" : "var(--text-muted)",
                      }}
                    >
                      {product.isAvailable ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: "1rem" }}>
                      <Link href={`/admin/products/${product.id}`} className="text-button" style={{ fontSize: "0.8125rem", color: "var(--accent-cyan)", textDecoration: "none" }}>
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
