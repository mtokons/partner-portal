import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getProducts } from "@/lib/sharepoint";
import { Download, ShoppingBag, FileText, Image, Video, Package } from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  brochure: FileText,
  marketing: Image,
  video: Video,
  template: FileText,
  default: Package,
};

export default async function PartnerMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const allProducts = await getProducts();
  const downloads = allProducts.filter(
    (p) => (p.category === "partner-downloads" || p.contentType) && p.isAvailable !== false
  );
  const services = allProducts.filter(
    (p) => p.category === "service" && p.isAvailable !== false
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          Partner Marketplace
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download marketing materials, brochures, and partner resources.
        </p>
      </div>

      {/* Downloads Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Downloads & Resources</h2>
        {downloads.length === 0 ? (
          <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
            <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No downloads available yet.</p>
            <p className="text-sm opacity-60">Marketing materials and resources will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloads.map((p) => {
              const contentType = p.contentType || "default";
              const Icon = CATEGORY_ICONS[contentType] || CATEGORY_ICONS.default;
              return (
                <div key={p.id} className="bg-card rounded-2xl border p-5 space-y-3 hover:shadow-md transition-shadow">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      {p.contentType && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {p.contentType}
                        </span>
                      )}
                    </div>
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
              );
            })}
          </div>
        )}
      </div>

      {/* Services Section */}
      {services.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Available Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border p-5 space-y-3">
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">€{p.price.toFixed(2)}</p>
                  {p.unit && <span className="text-xs text-muted-foreground">per {p.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
