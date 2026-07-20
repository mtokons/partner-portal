import { getEffectiveSession } from "@/lib/effective-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getMyCandidateRecords, getMyCandidateServices } from "@/app/customer/candidate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, Circle, CreditCard, MessageSquare } from "lucide-react";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import type { WorkflowCategory } from "@/types";

const paymentStatusLabel: Record<string, string> = {
  pending: "Payment Pending",
  "deposit-paid": "Deposit Paid",
  "fully-paid": "Fully Paid",
  refunded: "Refunded",
};

const paymentStatusColor: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800",
  "deposit-paid": "bg-blue-100 text-blue-800",
  "fully-paid": "bg-green-100 text-green-800",
  refunded: "bg-red-100 text-red-800",
};

export default async function CustomerTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string }>;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/customer-login");

  const { candidateId } = await searchParams;
  const candidates = await getMyCandidateRecords();

  if (candidates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Timeline</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No registrations yet</p>
            <p className="text-sm text-gray-400 mt-1">Your service timeline will appear here once you have an active plan</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCandidate = candidateId
    ? candidates.find((c) => c.id === candidateId) || candidates[0]
    : candidates[0];

  const services = await getMyCandidateServices(selectedCandidate.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">Track your service progress and stages</p>
        </div>
      </div>

      {/* Candidate Selector (if multiple) */}
      {candidates.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {candidates.map((c) => (
            <Link
              key={c.id}
              href={`/customer/timeline?candidateId=${c.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                c.id === selectedCandidate.id
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.sccgId} — {c.workflowCategory}
            </Link>
          ))}
        </div>
      )}

      {/* Registration summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Registration: {selectedCandidate.sccgId}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{selectedCandidate.workflowCategory}</Badge>
              <Badge className={paymentStatusColor[selectedCandidate.paymentStatus] || "bg-gray-100"}>
                {paymentStatusLabel[selectedCandidate.paymentStatus] || selectedCandidate.paymentStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Current Status</p>
              <p className="font-medium">{formatStatusLabel(selectedCandidate.currentStatus)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Fee</p>
              <p className="font-medium">€{selectedCandidate.totalServiceFee.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Required Deposit</p>
              <p className="font-medium">€{selectedCandidate.depositAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Registered</p>
              <p className="font-medium">{new Date(selectedCandidate.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Workflow Progress ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Process Timeline — {selectedCandidate.workflowCategory}
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">Your overall registration journey</p>
        </CardHeader>
        <CardContent>
          <WorkflowStepper
            category={selectedCandidate.workflowCategory as WorkflowCategory}
            currentStatus={selectedCandidate.currentStatus}
            isAdmin={false}
          />
        </CardContent>
      </Card>

      {/* ── Per-Service Workflows ── */}
      {services.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm px-1">Individual Service Progress</h2>
          {services.map((svc, idx) => {
            const isCompleted = svc.currentStatus === "COMPLETED";
            const isActive = svc.currentStatus && svc.currentStatus !== "COMPLETED";
            const svcCategory = (svc.workflowCategory || selectedCandidate.workflowCategory) as WorkflowCategory;
            const svcStatus = svc.currentStatus || "REGISTERED";
            return (
              <Card key={svc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center mr-1">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : isActive ? (
                          <Clock className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{svc.serviceName}</CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {svcCategory} &middot; {svc.packageType.replace(/-/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">€{svc.totalPrice.toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {formatStatusLabel(svcStatus)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <WorkflowStepper
                    category={svcCategory}
                    currentStatus={svcStatus}
                    isAdmin={false}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Total Service Fee</span>
              <span className="font-bold">€{selectedCandidate.totalServiceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Required Deposit</span>
              <span className="font-bold text-green-600">€{selectedCandidate.depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Remaining Balance</span>
              <span className="font-bold text-orange-600">
                €{Math.max(0, selectedCandidate.totalServiceFee - selectedCandidate.depositAmount).toFixed(2)}
              </span>
            </div>
            {selectedCandidate.paymentMethod && (
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-sm text-gray-600">Payment Method</span>
                <span className="text-sm">{selectedCandidate.paymentMethod}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Partner */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-purple-900 text-sm">Need help or have questions?</p>
            <p className="text-xs text-purple-700">Send a message to your partner directly through the portal</p>
          </div>
          <Link
            href="/customer/messages"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
