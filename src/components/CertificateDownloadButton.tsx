"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { generateCertificatePDF } from "@/lib/pdf-generator";
import type { SchoolCertificate } from "@/types";

interface CertificateDownloadButtonProps {
  certificate: SchoolCertificate;
  variant?: "default" | "outline" | "ghost";
}

export function CertificateDownloadButton({ certificate, variant = "ghost" }: CertificateDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateCertificatePDF(certificate);
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size="sm" 
      className="h-8 gap-2 rounded-xl"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Download
    </Button>
  );
}
