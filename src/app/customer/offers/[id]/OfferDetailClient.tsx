"use client";

import { useState } from "react";
import Link from "next/link";
import type { SalesOffer, SalesOfferItem, Product, Candidate, CandidateService } from "@/types";
import type { PartnerPaymentInfo } from "@/app/customer/candidate-actions";
import { acceptOfferAction, requestNewOfferAction } from "@/app/customer/candidate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ArrowLeft,
  CheckCircle,
  Clock,
  Circle,
  CreditCard,
  RefreshCw,
  Send,
  X,
  Building2,
  Banknote,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface Props {
  offer: SalesOffer;
  items: SalesOfferItem[];
  productMap: Record<string, Product>;
  existingCandidate: Candidate | null;
  existingServices: CandidateService[];
  partnerPaymentInfo: PartnerPaymentInfo | null;
  partnerEmail?: string;
  partnerPhone?: string;
}

export default function OfferDetailClient({
  offer: initialOffer,
  items,
  productMap,
  existingCandidate,
  existingServices,
  partnerPaymentInfo,
  partnerEmail,
  partnerPhone,
}: Props) {
  const [offer, setOffer] = useState(initialOffer);
  const [accepting, setAccepting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{
    paymentInfo?: PartnerPaymentInfo | null;
    alreadyRegistered?: boolean;
  } | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await acceptOfferAction(offer.id);
      if (res.success) {
        setOffer((prev) => ({ ...prev, status: "accepted" }));
        setAcceptResult({ paymentInfo: res.paymentInfo, alreadyRegistered: res.alreadyRegistered });
      } else {
        setAcceptError(res.error || "Failed to accept offer");
      }
    } catch {
      setAcceptError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleRequestNew() {
    if (!requestMessage.trim()) return;
    setRequesting(true);
    setRequestError(null);
    try {
      const res = await requestNewOfferAction(offer.id, requestMessage);
      if (res.success) {
        setRequestSent(true);
        setRequestOpen(false);
        setRequestMessage("");
      } else {
        setRequestError(res.error || "Failed to send request");
      }
    } catch {
      setRequestError("Something went wrong. Please try again.");
    } finally {
      setRequesting(false);
    }
  }

  const showPaymentInfo = acceptResult?.paymentInfo ?? partnerPaymentInfo;
  const hasPaymentDetails = showPaymentInfo && Object.values(showPaymentInfo).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer/offers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{offer.offerNumber}</h1>
            <Badge className={statusColor[offer.status] || "bg-gray-100 text-gray-800"}>
              {offer.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            From {offer.partnerName || "Partner"} &middot; Valid until{" "}
            {new Date(offer.validUntil).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>

      {/* Success banner — offer just accepted */}
      {acceptResult && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Offer Accepted!</p>
              <p className="text-sm text-emerald-700">
                A confirmation email has been sent to you. Your partner will complete your registration shortly.
              </p>
            </div>
          </div>
          {acceptResult.alreadyRegistered && (
            <p className="text-xs text-teal-700 bg-teal-100 rounded-lg px-3 py-2 mt-2">
              ✓ You are already registered as a candidate with this partner — your services are shown below.
            </p>
          )}
        </div>
      )}

      {/* "Request sent" toast */}
      {requestSent && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 flex items-center gap-3">
          <Send className="h-4 w-4 text-purple-600" />
          <p className="text-sm text-purple-800 font-medium">Your request has been sent to the partner.</p>
        </div>
      )}

      {/* Accept error */}
      {acceptError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {acceptError}
        </div>
      )}

      {/* Action Buttons — only for "sent" offers */}
      {offer.status === "sent" && !acceptResult && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold text-sm shadow-md hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Accept Offer
              </>
            )}
          </button>
          <button
            onClick={() => setRequestOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-100 hover:border-purple-300 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Request New Offer
          </button>
        </div>
      )}

      {/* Request New Offer — also visible for accepted/other statuses */}
      {offer.status !== "sent" && (
        <div className="flex justify-end">
          <button
            onClick={() => setRequestOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Request New Offer
          </button>
        </div>
      )}

      {/* Request New Offer Dialog */}
      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Request New Offer</h3>
                <p className="text-sm text-gray-500 mt-0.5">Tell your partner what you&apos;d like changed</p>
              </div>
              <button
                onClick={() => { setRequestOpen(false); setRequestError(null); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {requestError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{requestError}</p>
            )}
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="e.g. I'd like to include the premium coaching package, and could you extend the validity to end of month?"
              rows={4}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRequestOpen(false); setRequestError(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestNew}
                disabled={requesting || !requestMessage.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requesting ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {requesting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Offer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-lg font-bold">€{offer.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Discount</p>
              <p className="text-lg font-bold text-green-600">
                {offer.discountType === "percent"
                  ? `${offer.discount}%`
                  : `€${offer.discount.toFixed(2)}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-lg font-bold text-blue-600">€{offer.totalAmount.toFixed(2)}</p>
            </div>
          </div>
          {offer.notes && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{offer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Services &amp; What&apos;s Included</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => {
            const product = productMap[item.productId];
            const rawTags = product?.tags ?? [];
            const includes = rawTags
              .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
              .map((t) => t.replace(/^includes?:/i, "").trim());
            const autoIncludes: string[] = [];
            if (includes.length === 0 && product) {
              if (product.sessionsCount > 0)
                autoIncludes.push(
                  `${product.sessionsCount} expert session${product.sessionsCount !== 1 ? "s" : ""}`
                );
              if (product.description) autoIncludes.push(product.description);
            }
            const allIncludes = includes.length > 0 ? includes : autoIncludes;

            return (
              <div key={item.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{item.productName}</p>
                    {product?.category && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <p className="font-bold text-primary">€{item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                {allIncludes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      What&apos;s Included
                    </p>
                    <ul className="space-y-1">
                      {allIncludes.map((inc, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Payment Info — shown after acceptance OR if offer is accepted + payment info available */}
      {(offer.status === "accepted") && (
        <Card className={hasPaymentDetails ? "border-emerald-200" : "border-amber-200"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {hasPaymentDetails ? (
                <>
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-800">Payment Details</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800">Payment Information</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPaymentDetails ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Please transfer <span className="font-bold text-blue-600">€{offer.totalAmount.toFixed(2)}</span> to
                  your partner using the details below:
                </p>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2.5">
                  {showPaymentInfo!.accountHolderName && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-32 shrink-0">Account Holder</span>
                      <span className="text-sm font-semibold">{showPaymentInfo!.accountHolderName}</span>
                    </div>
                  )}
                  {showPaymentInfo!.bankName && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-32 shrink-0">Bank Name</span>
                      <span className="text-sm">{showPaymentInfo!.bankName}</span>
                    </div>
                  )}
                  {showPaymentInfo!.iban && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-32 shrink-0">IBAN</span>
                      <span className="text-sm font-mono font-bold tracking-wider">{showPaymentInfo!.iban}</span>
                    </div>
                  )}
                  {showPaymentInfo!.bic && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-32 shrink-0">BIC / SWIFT</span>
                      <span className="text-sm font-mono">{showPaymentInfo!.bic}</span>
                    </div>
                  )}
                  {showPaymentInfo!.accountNumber && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-32 shrink-0">Account Number</span>
                      <span className="text-sm font-mono">{showPaymentInfo!.accountNumber}</span>
                    </div>
                  )}
                  {showPaymentInfo!.paymentNote && (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-xs text-gray-500 mb-1">Instructions</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{showPaymentInfo!.paymentNote}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Payment details not yet available</p>
                  <p className="mt-1 text-amber-700">
                    Your partner <strong>{offer.partnerName || "SCCG Partner"}</strong> has not yet configured their
                    payment details. Please contact them directly
                    {partnerEmail && (
                      <> at <a href={`mailto:${partnerEmail}`} className="underline font-medium">{partnerEmail}</a></>
                    )}
                    {partnerPhone && <> or {partnerPhone}</>} to arrange payment.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Timeline — shown if candidate record exists */}
      {existingCandidate && (offer.status === "accepted") && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-500" />
                Your Registered Services
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                SCCG ID: {existingCandidate.sccgId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Registration overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-semibold mt-0.5">{existingCandidate.currentStatus}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Fee</p>
                <p className="text-sm font-bold mt-0.5 text-blue-600">
                  €{existingCandidate.totalServiceFee.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <Badge className="mt-1 text-xs" variant="outline">
                  {existingCandidate.paymentStatus}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Registered</p>
                <p className="text-xs mt-0.5 text-gray-600">
                  {new Date(existingCandidate.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {existingServices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Services are being set up — check back soon.
              </p>
            ) : (
              <div className="space-y-4">
                {existingServices.map((svc, idx) => {
                  const isCompleted = svc.currentStatus === "COMPLETED";
                  const isActive = !isCompleted && idx === 0;
                  return (
                    <div key={svc.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : isActive ? (
                          <Clock className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        {idx < existingServices.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 mt-1 ${isCompleted ? "bg-green-300" : "bg-gray-200"}`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p
                              className={`font-medium text-sm ${
                                isCompleted
                                  ? "text-green-700"
                                  : isActive
                                  ? "text-blue-700"
                                  : "text-gray-500"
                              }`}
                            >
                              {svc.serviceName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{svc.packageType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">€{svc.totalPrice.toFixed(2)}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {svc.currentStatus || "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t">
              <Link
                href="/customer/timeline"
                className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <CreditCard className="h-3.5 w-3.5" />
                View full timeline & payment history
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending registration notice — offer accepted but no candidate record yet */}
      {!existingCandidate && offer.status === "accepted" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 text-sm">Registration in Progress</p>
                <p className="text-sm text-blue-700 mt-1">
                  Your partner is setting up your service registration. Once complete, your service timeline and
                  progress will appear here. You can also check your{" "}
                  <Link href="/customer/timeline" className="underline font-medium">
                    timeline page
                  </Link>{" "}
                  for updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Partner CTA */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-purple-900 text-sm">Have questions about this offer?</p>
            <p className="text-xs text-purple-700">Send a message to your partner directly</p>
          </div>
          <Link
            href="/customer/messages"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Send Message
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
