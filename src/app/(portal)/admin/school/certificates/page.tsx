import { fetchCertificates } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Award, FileText, CheckCircle, TrendingUp, Search } from "lucide-react";
import { CertificateActions } from "@/components/school/CertificateActions";
import { ManualCertManager } from "@/components/school/ManualCertManager";

export default async function CertificatesPage() {
  const certs = await fetchCertificates();

  const stats = [
    { label: "Total Issued", value: certs.length, icon: Award, color: "text-primary", bg: "bg-primary/5" },
    { label: "Active", value: certs.filter(c => c.status === "issued").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Completion", value: certs.filter(c => c.certificateType === "completion").length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Participation", value: certs.filter(c => c.certificateType === "participation").length, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Archive</h1>
          <p className="text-muted-foreground text-sm font-medium">{certs.length} official documents in records</p>
        </div>
        <ManualCertManager />
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

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Cert #</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Recipient</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course & Level</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Type</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Grade</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Issued On</th>
                <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certs.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium italic">No certificates issued yet.</td></tr>
              ) : (
                certs.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-white/40 transition-colors">
                    <td className="py-4 px-6">
                       <Link href={`/admin/school/certificates/${c.id}`} className="font-mono text-[10px] font-black text-primary/60 hover:text-primary transition-colors">
                        {c.certificateNumber}
                       </Link>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900">{c.studentName}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {c.studentSccgId}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                       <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{c.courseName}</span>
                        <Badge variant="secondary" className="w-fit text-[9px] font-black h-4 px-1.5 bg-gray-100">{c.courseLevel}</Badge>
                       </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className={`capitalize font-black tracking-widest text-[9px] px-2 py-0.5 rounded-md ${
                        c.certificateType === "completion" ? "bg-green-50 text-green-700 border-green-100" : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}>
                        {c.certificateType}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 font-black text-gray-900">{c.finalGrade || "—"}</td>
                    <td className="py-4 px-6 font-bold text-gray-400 text-[11px]">{c.issuedDate}</td>
                    <td className="py-4 px-6 text-right">
                      <CertificateActions certificate={c} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
