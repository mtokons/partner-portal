import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getProducts } from "@/lib/sharepoint";
import { Download, ShoppingBag } from "lucide-react";

export default async function PartnerMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner/pending");

  const allProducts = await getProducts();
  const downloads = allProducts.filter(
    (p) => p.category === "partner-downloads" && p.isAvailable !== false
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Partner Downloads</h1>
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Download className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No downloads available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {downloads.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border p-5 space-y-3">
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-32 object-cover rounded-xl"
                />
              )}
              <div>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {p.description}
                </p>
              </div>
              {p.tags && p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <a
                href={p.imageUrl ?? "#"}
                download
                className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
