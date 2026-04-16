import { fetchTeachers } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, User, GraduationCap, Mail, Phone, Languages } from "lucide-react";
import { TeacherActions } from "@/components/school/TeacherActions";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeacherForm } from "@/components/school/TeacherForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TeachersPage() {
  const teachers = await fetchTeachers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-muted-foreground text-sm font-medium">{teachers.length} qualified instructors registered</p>
        </div>
        
        <Dialog>
          <DialogTrigger>
            <span className={cn(buttonVariants({ variant: "default" }), "inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer")}>
              <Plus className="h-4 w-4" /> Add Teacher
            </span>
          </DialogTrigger>
          <DialogContent className="rounded-[32px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Register New Teacher</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <TeacherForm />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length === 0 ? (
          <Card className="col-span-full border-0 shadow-2xl rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/20 p-20 text-center">
             <div className="h-20 w-20 bg-gray-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-gray-300">
               <GraduationCap className="h-10 w-10" />
             </div>
             <p className="text-gray-400 font-medium italic">No teachers registered yet. Add your first instructor to start assigning batches.</p>
          </Card>
        ) : (
          teachers.map((t) => (
            <Card key={t.id} className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20 hover:shadow-2xl transition-all group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-16 w-16 rounded-[22px] bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                    {t.name.slice(0, 1)}
                  </div>
                  <TeacherActions teacher={t} />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{t.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{t.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline" className="rounded-lg bg-white border-primary/10 text-primary font-black text-[10px] py-1 px-2 flex items-center gap-1">
                      <Languages className="h-3 w-3" />
                      {t.language}
                    </Badge>
                    <Badge variant="secondary" className="rounded-lg bg-gray-100 text-gray-500 font-bold text-[10px] py-1 px-2 border-0">
                      {t.specialization || "DSH/Goethe"}
                    </Badge>
                  </div>

                  {t.bio && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium">
                      {t.bio}
                    </p>
                  )}

                  <div className="pt-4 mt-4 border-t border-gray-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-primary/40" />
                      <span className="text-[10px] font-mono font-bold text-gray-400">{t.phone || "No phone"}</span>
                    </div>
                    <Badge className="text-[9px] bg-green-500/10 text-green-700 hover:bg-green-500/20 px-2 py-0 border-0 rounded-md uppercase font-black tracking-widest">
                      {t.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
