import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getProducts } from "@/lib/sharepoint";
import { loadRate, fmtBdt } from "@/lib/serverCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlaceOrderButton from "./PlaceOrderButton";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const [products, rate] = await Promise.all([getProducts(), loadRate()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant="outline">{product.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{product.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-700">{fmtBdt(product.price, rate, { compact: true })}</span>
                <span className="text-sm text-gray-500">Stock: {product.stock}</span>
              </div>
              {user.role === "partner" && (
                <PlaceOrderButton productId={product.id} productName={product.name} price={product.price} partnerId={user.partnerId} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
