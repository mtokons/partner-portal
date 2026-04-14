"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import type { SchoolCertificate } from "@/types";

interface CertificatePrintViewProps {
  certificate: SchoolCertificate;
}

export default function CertificatePrintView({ certificate }: CertificatePrintViewProps) {
  const isCompletion = certificate.certificateType === "completion";
  
  // Standard text content
  const title = isCompletion ? "ZERTIFIKAT" : "TEILNAHMEBESCHEINIGUNG";
  const subtitle = isCompletion 
    ? "hat den folgenden Sprachkurs erfolgreich abgeschlossen:"
    : "nimmt hiermit aktiv an folgendem Sprachkurs teil:";
    
  const statusText = isCompletion 
    ? `Status: Erfolgreich abgeschlossen (Note: ${certificate.finalGrade || "Bestanden"})`
    : "Status: Der Kurs ist derzeit fortlaufend.";

  return (
    <div className="w-[210mm] h-[297mm] bg-white relative mx-auto shadow-2xl rounded-sm overflow-hidden print:w-[210mm] print:h-[297mm] print:shadow-none print:m-0 print:rounded-none">
      
      {/* Background Graphic Pattern (Simulating spiral) */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] border-[0.5px] border-fuchsia-900/5 rounded-full -mt-20 -mr-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] border-[0.5px] border-fuchsia-900/5 rounded-full -mt-24 -mr-24 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] border-[0.5px] border-fuchsia-900/5 rounded-full -mt-32 -mr-32 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] border-[0.5px] border-fuchsia-900/5 rounded-full -mt-48 -mr-48 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[900px] h-[900px] border-[0.5px] border-fuchsia-900/5 rounded-full -mt-80 -mr-80 pointer-events-none" />
      
      {/* Double Border */}
      <div className="absolute inset-[15mm] border-[2px] border-fuchsia-900 pointer-events-none" />
      <div className="absolute inset-[13mm] border-[0.5px] border-fuchsia-900/50 pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 p-[20mm] h-full flex flex-col items-center justify-between">
        
        {/* Top Spacer */}
        <div className="h-16" />

        {/* Header */}
        <div className="text-center w-full">
          <h1 className="text-4xl font-extrabold tracking-widest text-fuchsia-900 uppercase">
            {title}
          </h1>
        </div>

        {/* Middle Content */}
        <div className="text-center w-full flex flex-col gap-12 mt-16 flex-1 justify-center">
          <div>
            <h2 className="text-4xl font-bold text-fuchsia-900">
              {certificate.studentName}
            </h2>
          </div>

          <div>
            <p className="text-lg font-bold text-slate-800">
              {subtitle}
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-black mt-2">
              {certificate.courseName}
            </h3>
          </div>
          
          <div className="mt-8 text-left max-w-lg mx-auto w-full">
            <p className="text-sm font-bold italic text-slate-900">
              {statusText}
            </p>
          </div>
        </div>

        {/* Footer Area */}
        <div className="w-full flex justify-between items-end mt-12 px-8 mb-4">
          
          {/* Left: Logo */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {/* SVG SCCG Logo placeholder */}
              <div className="relative w-12 h-12 flex items-center justify-center -ml-2">
                 <svg viewBox="0 0 100 100" className="w-full h-full">
                   <path d="M50 10 L90 50 L50 90 L10 50 Z" fill="none" stroke="#e11d48" strokeWidth="8"/>
                   <circle cx="25" cy="25" r="8" fill="#f59e0b" />
                   <circle cx="75" cy="25" r="8" fill="#059669" />
                   <circle cx="25" cy="75" r="8" fill="#e11d48" />
                   <circle cx="75" cy="75" r="8" fill="#000000" />
                 </svg>
              </div>
              <span className="text-4xl font-black text-rose-600 tracking-tighter">SCCG</span>
            </div>
            <p className="text-[9px] text-slate-500 font-medium tracking-tight">Connecting Talents Empowering Career</p>
            <p className="text-[10px] text-slate-400 mt-8">Issue Date: {new Date(certificate.issuedDate).toLocaleDateString('en-GB')}</p>
          </div>

          {/* Middle: Signature */}
          <div className="flex flex-col items-center">
            {/* Signature image or font */}
            <div className="font-serif italic text-4xl mb-2 text-slate-800 border-b border-black/30 w-48 text-center pb-2">
              Nokan
            </div>
            <p className="text-xs text-slate-700">Kurskoordinator</p>
            <p className="text-xs text-slate-700 mt-2">SCCG Career Lab UG</p>
            <p className="text-xs text-slate-700">(haftungsbeschränkt)</p>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center gap-2 transform -translate-y-4">
            <div className="p-2 border border-black/10 bg-white">
              <QRCodeSVG 
                 value={certificate.verificationUrl} 
                 size={90}
                 level="H"
                 includeMargin={false}
              />
            </div>
          </div>
        </div>
        
        {/* Absolute Cert ID */}
        <p className="absolute bottom-[20mm] right-[28mm] text-[10px] text-slate-400 font-mono">
            Certificate: {certificate.certificateNumber}
        </p>

      </div>
    </div>
  );
}
