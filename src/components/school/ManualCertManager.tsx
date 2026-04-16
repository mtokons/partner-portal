"use client";

import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Search, Loader2, Award, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { fetchEnrollments } from "@/app/(portal)/admin/school/actions";
import { IssueCertificateButton } from "@/components/IssueCertificateButton";
import type { SchoolEnrollment } from "@/types";

export function ManualCertManager() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchEnrollments();
        // Simple client-side search for enrollment selection
        const filtered = results.filter(e => 
          e.studentName.toLowerCase().includes(search.toLowerCase()) || 
          e.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
          e.batchCode.toLowerCase().includes(search.toLowerCase())
        );
        setEnrollments(filtered.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className={cn(buttonVariants({ variant: "default" }), "inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer")}>
          <Award className="h-4 w-4" /> New Certificate
        </span>
      </DialogTrigger>
      <DialogContent className="rounded-[32px] sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-black">Issue Manual Certificate</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              placeholder="Search student or batch code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-gray-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : enrollments.length > 0 ? (
              enrollments.map((e) => (
                <div key={e.id} className="p-4 rounded-[22px] border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{e.studentName}</span>
                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">{e.batchCode}</span>
                  </div>
                  <IssueCertificateButton enrollment={e} />
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 italic text-sm">
                No matching enrollments found.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
