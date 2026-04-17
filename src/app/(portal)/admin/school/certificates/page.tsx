import { fetchCertificates } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Award, FileText, CheckCircle, TrendingUp, Search, ShieldX } from "lucide-react";
import { ManualCertManager } from "@/components/school/ManualCertManager";
import { CertificateGallery } from "@/components/school/CertificateGallery";

export default async function CertificatesPage() {
  const certs = await fetchCertificates();

  const stats = [
    { label: "Total Issued", value: certs.length, icon: Award, color: "text-primary", bg: "bg-primary/5" },
    { label: "Active", value: certs.filter(c => c.status === "issued").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Completion", value: certs.filter(c => c.certificateType === "completion").length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Revoked", value: certs.filter(c => c.status === "revoked").length, icon: ShieldX, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Archive</h1>
          <p className="text-muted-foreground text-sm font-medium">{certs.length} official documents in records</p>
        </div>
        <div className="flex items-center gap-3">
          <ManualCertManager />
          <Link href="/admin/school/certificate-generator">
            <Badge variant="outline" className="h-10 px-4 text-sm font-bold cursor-pointer hover:bg-primary/5 transition-colors">
              <Award className="h-4 w-4 mr-2" /> Certificate Generator
            </Badge>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-lg hover:shadow-xl transition-shadow rounded-[28px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CertificateGallery certificates={JSON.parse(JSON.stringify(certs))} />
    </div>
  );
}
