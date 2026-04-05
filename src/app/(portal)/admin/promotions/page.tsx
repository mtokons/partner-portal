import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPromotions } from "@/lib/sharepoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Calendar, Zap, Gift, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";

const typeIcon: Record<string, React.ElementType> = {
  discount: Tag,
  bundle: Gift,
  promo: Zap,
  announcement: Megaphone,
};

const typeColors: Record<string, string> = {
  discount: "bg-rose-100 text-rose-700 border-rose-200",
  bundle: "bg-violet-100 text-violet-700 border-violet-200",
  promo: "bg-amber-100 text-amber-700 border-amber-200",
  announcement: "bg-blue-100 text-blue-700 border-blue-200",
};

export default async function AdminPromotionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const promotions = await getPromotions();
  const active = promotions.filter((p) => p.isActive).length;
  const now = new Date();
  const live = promotions.filter(
    (p) => p.isActive && new Date(p.startDate) <= now && (!p.endDate || new Date(p.endDate) >= now)
  ).length;

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-blue" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Marketing</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage discounts, bundles, campaigns, and announcements shown in the Sales Shop.
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-primary/25 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Promotion
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: promotions.length, color: "text-foreground", bg: "bg-muted/50 border-border" },
          { label: "Active", value: active, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Live Now", value: live, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
        ].map((k) => (
          <div key={k.label} className={`px-5 py-4 rounded-2xl border text-center ${k.bg}`}>
            <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Promotions grid */}
      {promotions.length === 0 ? (
        <div className="py-24 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No promotions yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create your first promotion to drive sales in the shop.</p>
          <Link href="/admin/promotions/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="h-4 w-4" /> Create Promotion
          </Link>
        </div>
      ) : (
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              All Promotions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Promotion", "Type", "Applies To", "Discount", "Duration", "Priority", "Status"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {promotions.map((promo) => {
                    const Icon = typeIcon[promo.type] || Tag;
                    const isLive = promo.isActive && new Date(promo.startDate) <= now && (!promo.endDate || new Date(promo.endDate) >= now);
                    return (
                      <tr key={promo.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{promo.title}</p>
                              {promo.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{promo.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`capitalize rounded-full text-[10px] border ${typeColors[promo.type] || ""}`}>
                            {promo.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground capitalize text-xs">{promo.appliesTo}</td>
                        <td className="px-6 py-4 font-black text-foreground">
                          {promo.discountValue > 0
                            ? promo.discountType === "percent"
                              ? `${promo.discountValue}%`
                              : `BDT ${promo.discountValue}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(promo.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {promo.endDate && ` → ${new Date(promo.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-muted-foreground">{promo.priority}</td>
                        <td className="px-6 py-4">
                          {isLive ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                              <ToggleRight className="h-4 w-4" /> Live
                            </div>
                          ) : promo.isActive ? (
                            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
                              <ToggleRight className="h-4 w-4" /> Scheduled
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                              <ToggleLeft className="h-4 w-4" /> Off
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
