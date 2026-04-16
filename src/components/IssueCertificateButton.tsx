"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { issueCertificate } from "@/app/(portal)/admin/school/actions";
import { generateCertificatePDF } from "@/lib/pdf-generator";
import type { SchoolEnrollment, CertificateType } from "@/types";
import { cn } from "@/lib/utils";

interface IssueCertificateButtonProps {
  enrollment: SchoolEnrollment;
}

export function IssueCertificateButton({ enrollment }: IssueCertificateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issuedCert, setIssuedCert] = useState<any>(null);

  async function handleIssue(type: CertificateType) {
    setLoading(true);
    try {
      // The action expects a lot of data, we spread what we have and fill defaults
      const result = await issueCertificate({
        certificateType: type,
        studentUserId: enrollment.studentUserId,
        studentName: enrollment.studentName,
        studentSccgId: enrollment.sccgId || "SCCG-STUDENT",
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        courseName: enrollment.courseName,
        courseLevel: "B1", // Default to B1 as seen in screenshot, should ideally be from course
        batchId: enrollment.batchId,
        batchCode: enrollment.batchCode,
        attendancePercentage: 90, // Placeholder, ideally from attendance action
        finalGrade: enrollment.finalGrade,
        examScore: enrollment.examScore,
      });

      setIssuedCert(result);
      toast.success("Certificate issued successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async () => {
    if (!issuedCert) return;
    await generateCertificatePDF(issuedCert);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">
          <Award className="h-3 w-3" />
          Issue Cert
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[32px] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Issue Certificate</DialogTitle>
          <DialogDescription>
            Generate an official SCCG document for <strong>{enrollment.studentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {issuedCert ? (
          <div className="py-12 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95">
             <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Check className="h-10 w-10 stroke-[3]" />
             </div>
             <div className="text-center">
                <p className="font-black text-xl">Certificate Ready!</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {issuedCert.certificateNumber}</p>
             </div>
             <Button className="w-full h-14 rounded-2xl font-black text-lg gap-3" onClick={handleDownload}>
                Download PDF
             </Button>
          </div>
        ) : (
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-1 gap-4">
              <div 
                onClick={() => handleIssue("participation")}
                className="p-6 rounded-[24px] border-2 border-gray-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                   <p className="font-black text-lg group-hover:text-primary transition-colors">Teilnahmebescheinigung</p>
                   <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] uppercase font-black tracking-widest">Participation</Badge>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">Standard cert for course attendance. Suitable for active students.</p>
              </div>

              <div 
                onClick={() => handleIssue("completion")}
                className="p-6 rounded-[24px] border-2 border-gray-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group opacity-60 hover:opacity-100"
              >
                <div className="flex justify-between items-start mb-2">
                   <p className="font-black text-lg group-hover:text-primary transition-colors">Course Completion</p>
                   <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] uppercase font-black tracking-widest">Graduated</Badge>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">Full course completion cert. Includes final grades and exam scores.</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[32px] flex items-center justify-center z-50">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
