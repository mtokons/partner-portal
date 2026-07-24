"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GraduationCap, Mail, Phone, Languages, CheckCircle, DollarSign } from "lucide-react";
import { TeacherActions } from "./TeacherActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeacherForm } from "./TeacherForm";
import { Button } from "@/components/ui/button";
import type { SchoolTeacher } from "@/types";

interface TeachersPageClientProps {
  teachers: SchoolTeacher[];
}

export function TeachersPageClient({ teachers: initialTeachers }: TeachersPageClientProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [credentialsSent, setCredentialsSent] = useState(false);

  function handleTeacherAdded() {
    setIsAddOpen(false);
    setCredentialsSent(true);
    setTimeout(() => setCredentialsSent(false), 6000);
    // Reload to show the new teacher
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-muted-foreground text-sm font-medium">{initialTeachers.length} qualified instructors registered</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/school/teachers/earnings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
            <DollarSign className="h-4 w-4" /> Earnings
          </Link>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 h-auto"
          >
            <Plus className="h-4 w-4" /> Add Teacher
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {credentialsSent && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-bold">Teacher added! Login credentials have been sent to their email address.</p>
        </div>
      )}

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialTeachers.length === 0 ? (
          <Card className="col-span-full border-0 shadow-2xl rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/20 p-20 text-center">
            <div className="h-20 w-20 bg-gray-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-gray-300">
              <GraduationCap className="h-10 w-10" />
            </div>
            <p className="text-gray-400 font-medium italic">No teachers registered yet. Add your first instructor to start assigning batches.</p>
          </Card>
        ) : (
          initialTeachers.map((t) => (
            <Card key={t.id} className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20 hover:shadow-2xl transition-all group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-16 w-16 rounded-[22px] bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                    {t.name?.slice(0, 1)?.toUpperCase() || "?"}
                  </div>
                  <TeacherActions teacher={t} />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{t.name || "Unnamed Teacher"}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{t.email}</span>
                    </div>
                    {t.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{t.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {t.language && (
                      <Badge variant="outline" className="rounded-lg bg-white border-primary/10 text-primary font-black text-[10px] py-1 px-2 flex items-center gap-1">
                        <Languages className="h-3 w-3" />
                        {t.language.charAt(0).toUpperCase() + t.language.slice(1)}
                      </Badge>
                    )}
                    {t.specialization && (
                      <Badge variant="secondary" className="rounded-lg font-bold text-[10px] py-1 px-2">
                        {t.specialization}
                      </Badge>
                    )}
                    <Badge
                      variant={t.status === "active" ? "default" : "secondary"}
                      className="rounded-lg text-[10px] py-1 px-2 font-black capitalize"
                    >
                      {t.status}
                    </Badge>
                  </div>

                  {t.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-1">{t.bio}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Teacher Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Register New Teacher</DialogTitle>
            <p className="text-sm text-muted-foreground">Login credentials will be sent to the teacher's email automatically.</p>
          </DialogHeader>
          <div className="py-4">
            <TeacherForm onSuccess={handleTeacherAdded} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
