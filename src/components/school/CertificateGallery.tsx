"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award, Eye, Trash2, Download, ShieldCheck, ShieldX,
  LayoutGrid, List, Search, ExternalLink, Copy, CheckCircle
} from "lucide-react";
import { CertificateDownloadButton } from "@/components/CertificateDownloadButton";
import { deleteCertificateAction, revokeCertificateAction } from "@/app/(portal)/admin/school/actions";
import type { SchoolCertificate } from "@/types";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ViewMode = "gallery" | "table";

export function CertificateGallery({ certificates }: { certificates: SchoolCertificate[] }) {
  const [view, setView] = useState<ViewMode>("gallery");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "issued" | "revoked">("all");
  const [deleteTarget, setDeleteTarget] = useState<SchoolCertificate | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SchoolCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = certificates.filter((c) => {
    if (filter === "issued" && c.status !== "issued") return false;
    if (filter === "revoked" && c.status !== "revoked") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.certificateNumber.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.verificationCode?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCertificateAction(deleteTarget.id);
      setDeleteTarget(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to delete certificate");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setIsRevoking(true);
    try {
      await revokeCertificateAction(revokeTarget.id, revokeReason);
      setRevokeTarget(null);
      setRevokeReason("");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to revoke certificate");
    } finally {
      setIsRevoking(false);
    }
  };

  const copyVerifyLink = async (cert: SchoolCertificate) => {
    const url = cert.verificationUrl || `https://portal.mysccg.de/verify/${cert.verificationCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopiedId(cert.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, cert #, course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white/50 text-sm w-[280px] focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-10 px-3 rounded-xl border border-gray-200 bg-white/50 text-sm appearance-none outline-none"
          >
            <option value="all">All Status</option>
            <option value="issued">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "gallery" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("gallery")}
            className="rounded-lg"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            className="rounded-lg"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground font-medium">
        Showing {filtered.length} of {certificates.length} certificates
      </p>

      {/* Gallery View */}
      {view === "gallery" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400">
              <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No certificates found</p>
            </div>
          ) : (
            filtered.map((c) => (
              <Card
                key={c.id}
                className={`border-0 shadow-lg hover:shadow-xl transition-all rounded-[28px] overflow-hidden bg-white/70 backdrop-blur-xl relative group ${
                  c.status === "revoked" ? "opacity-60 border-red-200" : ""
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                        c.status === "revoked" ? "bg-red-50" : "bg-primary/5"
                      }`}>
                        {c.status === "revoked" ? (
                          <ShieldX className="h-6 w-6 text-red-500" />
                        ) : (
                          <Award className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-black text-primary/60">{c.certificateNumber}</p>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[9px] font-black px-1.5 py-0 mt-0.5 ${
                            c.certificateType === "completion"
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}
                        >
                          {c.certificateType}
                        </Badge>
                      </div>
                    </div>
                    <Badge
                      className={`text-[9px] font-black ${
                        c.status === "issued"
                          ? "bg-green-100 text-green-700"
                          : c.status === "revoked"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status === "issued" ? (
                        <><ShieldCheck className="h-3 w-3 mr-1" />Active</>
                      ) : (
                        <><ShieldX className="h-3 w-3 mr-1" />{c.status}</>
                      )}
                    </Badge>
                  </div>

                  {/* Student */}
                  <div>
                    <p className="text-lg font-black text-gray-900">{c.studentName}</p>
                    <p className="text-xs text-muted-foreground font-bold">{c.courseName} — {c.courseLevel}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase">Issued</p>
                      <p className="font-bold text-gray-700">{c.issuedDate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase">Attendance</p>
                      <p className="font-bold text-gray-700">{c.attendancePercentage}%</p>
                    </div>
                    {c.finalGrade && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Grade</p>
                        <p className="font-bold text-gray-700">{c.finalGrade}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase">Issued By</p>
                      <p className="font-bold text-gray-700 truncate">{c.issuedByName}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link href={`/admin/school/certificates/${c.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </Link>
                    <CertificateDownloadButton certificate={c} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => copyVerifyLink(c)}
                    >
                      {copiedId === c.id ? (
                        <><CheckCircle className="h-3 w-3 mr-1 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Link</>
                      )}
                    </Button>
                    {c.status === "issued" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-xs text-amber-600 hover:text-amber-700"
                        onClick={() => setRevokeTarget(c)}
                      >
                        <ShieldX className="h-3 w-3 mr-1" /> Revoke
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs text-red-600 hover:text-red-700 ml-auto"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Cert #</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Recipient</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Type</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Issued</th>
                  <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium italic">No certificates found.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-white/40 transition-colors">
                      <td className="py-4 px-6">
                        <Link href={`/admin/school/certificates/${c.id}`} className="font-mono text-[10px] font-black text-primary/60 hover:text-primary">
                          {c.certificateNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-6 font-black text-gray-900">{c.studentName}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-800">{c.courseName}</span>
                        <Badge variant="secondary" className="ml-1 text-[9px] font-black h-4 px-1.5 bg-gray-100">{c.courseLevel}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className={`capitalize text-[9px] font-black px-2 py-0.5 ${
                          c.certificateType === "completion" ? "bg-green-50 text-green-700 border-green-100" : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>{c.certificateType}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`text-[9px] font-black ${
                          c.status === "issued" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>{c.status}</Badge>
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-[11px] font-bold">{c.issuedDate}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CertificateDownloadButton certificate={c} />
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyVerifyLink(c)}>
                            {copiedId === c.id ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          {c.status === "issued" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600" onClick={() => setRevokeTarget(c)}>
                              <ShieldX className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Certificate</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete certificate <strong>{deleteTarget?.certificateNumber}</strong> for <strong>{deleteTarget?.studentName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => { setRevokeTarget(null); setRevokeReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              This will invalidate certificate <strong>{revokeTarget?.certificateNumber}</strong> for <strong>{revokeTarget?.studentName}</strong>. Verification will show it as revoked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for revocation</label>
            <Input
              placeholder="Enter reason..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking || !revokeReason.trim()}>
              {isRevoking ? "Revoking..." : "Revoke Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
