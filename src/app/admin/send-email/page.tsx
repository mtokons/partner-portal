"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { sendEmailToClientAction } from "./actions";

export default function SendEmailPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const res = await sendEmailToClientAction(email, name, subject, message);
    setResult({ success: res.success, message: "message" in res ? res.message : ("error" in res ? res.error : "Unknown") });
    setSending(false);

    if (res.success) {
      setEmail("");
      setName("");
      setSubject("");
      setMessage("");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Send Email to Client</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send emails to clients via Power Automate. Emails are sent from your organization&apos;s email.
        </p>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Compose Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Recipient Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message here..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                result.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {result.message}
              </div>
            )}

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-base">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setSubject("Payment Reminder");
              setMessage("This is a friendly reminder that your payment is due soon. Please ensure timely payment to avoid any late fees.\n\nIf you have already made the payment, please disregard this message.\n\nThank you for your business!");
            }}
            className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Payment Reminder</span>
              <Badge variant="outline" className="text-xs">Template</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Send a payment reminder to a client</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject("Order Confirmation");
              setMessage("Thank you for your order! We are pleased to confirm that your order has been received and is being processed.\n\nYou will receive a tracking number once your order has been shipped.\n\nThank you for choosing our services!");
            }}
            className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Order Confirmation</span>
              <Badge variant="outline" className="text-xs">Template</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Send order confirmation to a client</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubject("Session Scheduled");
              setMessage("Your session has been scheduled. Please find the details below:\n\n- Date: [DATE]\n- Time: [TIME]\n- Expert: [EXPERT NAME]\n\nPlease be prepared and join on time. If you need to reschedule, please let us know at least 24 hours in advance.");
            }}
            className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Session Notification</span>
              <Badge variant="outline" className="text-xs">Template</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Notify client about an upcoming session</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
