import { fetchLanguageProducts } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Tag, Package, Globe } from "lucide-react";
import { AddCourseDialog } from "@/components/school/AddCourseDialog";

export default async function CoursesPage() {
  const products = await fetchLanguageProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Language Courses</h1>
          <p className="text-muted-foreground text-sm font-medium">
            {products.length} language product{products.length !== 1 ? "s" : ""} available as courses
          </p>
        </div>
        <AddCourseDialog />
      </div>

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">SKU</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course Name</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Category</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Unit</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Sessions</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Price (BDT)</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Price (EUR)</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-white/40 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-primary/60">{p.sku || "—"}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline" className="rounded-lg bg-white font-bold capitalize">
                      <Globe className="h-3 w-3 mr-1" /> {p.category || "Language"}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="secondary" className="rounded-lg font-bold text-[10px] capitalize">
                      <Package className="h-3 w-3 mr-1" /> {p.unit}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-600">{p.sessionsCount > 0 ? p.sessionsCount : "—"}</td>
                  <td className="py-4 px-6 font-black text-gray-900">
                    {p.retailPriceBdt > 0 ? `৳${p.retailPriceBdt.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-4 px-6 font-black text-gray-900">
                    {p.retailPriceEur > 0 ? `€${p.retailPriceEur.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-4 px-6">
                    <Badge
                      variant={p.isAvailable ? "default" : "secondary"}
                      className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md"
                    >
                      {p.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 bg-gray-50 rounded-[22px] flex items-center justify-center">
                        <Tag className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium italic">
                        No language products found. Add language products in the Products catalogue.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

