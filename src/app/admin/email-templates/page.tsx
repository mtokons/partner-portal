"use client";

import { useState } from "react";
import { Mail, Eye, Send, Copy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    key: "welcome-customer",
    name: "Welcome Customer",
    description: "Sent when a new customer account is created by a partner.",
    variables: ["customerName", "sccgId", "loginUrl", "tempPassword", "partnerName"],
  },
  {
    key: "welcome-employee",
    name: "Welcome Employee",
    description: "Sent when a new employee is onboarded via HR.",
    variables: ["employeeName", "sccgId", "designation", "department", "joiningDate", "managerName"],
  },
  {
    key: "enrollment-confirmation",
    name: "Enrollment Confirmation",
    description: "Sent when a student is enrolled in a language course.",
    variables: ["studentName", "courseName", "batchCode", "schedule", "teacherName", "startDate", "totalFee"],
  },
  {
    key: "certificate-issued",
    name: "Certificate Issued",
    description: "Sent when a certificate is issued to a student.",
    variables: ["studentName", "certificateType", "courseName", "certificateNumber", "verificationUrl"],
  },
  {
    key: "results-published",
    name: "Results Published",
    description: "Sent when exam results are published for a batch.",
    variables: ["studentName", "courseName", "batchCode", "examName"],
  },
  {
    key: "offer-sent",
    name: "Offer Sent to Client",
    description: "Sent when a partner sends a sales offer to a client.",
    variables: ["clientName", "offerNumber", "totalAmount", "validUntil", "partnerName"],
  },
];

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].key);
  const [copied, setCopied] = useState(false);

  const active = TEMPLATES.find((t) => t.key === selectedTemplate)!;

  function copyVariables() {
    navigator.clipboard.writeText(active.variables.map((v) => `\${data.${v}}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          Email Templates
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage email templates used throughout the portal. Templates use Office 365 Graph API.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTemplate(t.key)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all",
                selectedTemplate === t.key
                  ? "bg-primary/5 border-primary/30 shadow-sm"
                  : "bg-card hover:bg-accent/50"
              )}
            >
              <p className="font-medium text-sm text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Template Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                {active.name}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={copyVariables}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-accent transition-colors"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Variables"}
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{active.description}</p>

            {/* Variables */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Template Variables
              </p>
              <div className="flex flex-wrap gap-1.5">
                {active.variables.map((v) => (
                  <code
                    key={v}
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-mono"
                  >
                    {`\${${v}}`}
                  </code>
                ))}
              </div>
            </div>

            {/* Email Preview */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2a4a] px-8 py-6">
                <h3 className="text-white text-xl font-bold">SCCG Portal</h3>
                <p className="text-slate-400 text-sm mt-1">{active.name}</p>
              </div>
              <div className="bg-white p-8 text-sm text-gray-700 space-y-3">
                <p>Dear <strong className="text-gray-900">{`{${active.variables[0]}}`}</strong>,</p>
                <p className="text-gray-500">
                  This is a preview of the <strong>{active.name}</strong> email template.
                  The actual email is generated using HTML with inline CSS for maximum email client compatibility.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Data Fields</p>
                  {active.variables.slice(1).map((v) => (
                    <div key={v} className="flex justify-between py-1 text-xs border-b border-gray-100 last:border-0">
                      <span className="text-gray-500">{v.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                      <span className="font-mono text-gray-400">{`{${v}}`}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">— SCCG Portal Team</p>
              </div>
            </div>
          </div>

          {/* Integration Info */}
          <div className="bg-muted/30 border rounded-2xl p-5 text-sm">
            <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Email Delivery
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Emails sent via Microsoft Graph API (Office 365)</li>
              <li>Sender: <code className="text-xs bg-muted px-1 py-0.5 rounded">portal@sccg.com</code></li>
              <li>Templates are defined in <code className="text-xs bg-muted px-1 py-0.5 rounded">src/lib/email.ts</code></li>
              <li>Supports HTML content, attachments, CC recipients</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
