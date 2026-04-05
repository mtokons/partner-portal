import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getProducts } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Tag, Star, AlertCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function AdminProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const products = await getProducts();
  const withDiscount = products.filter((p) => p.discount && p.discount > 0).length;
  const outOfStock = products.filter((p) => (p.stock ?? 1) <= 0).length;
  const unavailable = products.filter((p) => p.isAvailable === false).length;

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Catalog</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Product Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage your product catalog — images, pricing, discounts, and availability.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-primary/25 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
          { label: "With Discount", value: withDiscount, icon: Tag, color: "text-rose-500", bg: "bg-rose-50 border-rose-100" },
          { label: "Out of Stock", value: outOfStock, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
          { label: "Unavailable", value: unavailable, icon: Star, color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
        ].map((kpi) => (
          <div key={kpi.label} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${kpi.bg}`}>
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Product grid */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            All Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Product", "Category", "Price (BDT)", "Discount", "Stock", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products.map((product) => {
                  const hasDiscount = product.discount && product.discount > 0;
                  const effectivePrice = hasDiscount
                    ? product.discountType === "percent"
                      ? product.price * (1 - (product.discount! / 100))
                      : product.price - product.discount!
                    : product.price;
                  const isAvailable = product.isAvailable !== false;

                  return (
                    <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt={product.name} width={48} height={48} className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="rounded-full text-[10px]">{product.category}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-foreground">{effectivePrice.toLocaleString()}</p>
                          {hasDiscount && (
                            <p className="text-xs text-muted-foreground line-through">{product.price.toLocaleString()}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hasDiscount ? (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-200 rounded-full text-[10px] border">
                            {product.discountType === "percent" ? `${product.discount}% OFF` : `BDT ${product.discount} OFF`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold text-sm ${(product.stock ?? 1) <= 0 ? "text-rose-600" : (product.stock ?? 99) < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                          {product.stock ?? "∞"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`rounded-full text-[10px] border ${isAvailable ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
                          {isAvailable ? "Available" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
