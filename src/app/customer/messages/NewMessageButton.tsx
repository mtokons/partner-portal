"use client";

import { useState } from "react";
import { sendMessageToPartner } from "@/app/customer/candidate-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function NewMessageButton({ candidateId }: { candidateId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setError("");

    const result = await sendMessageToPartner({
      subject: subject.trim(),
      message: message.trim(),
      candidateId,
    });

    setSending(false);

    if (result.success) {
      setIsOpen(false);
      setSubject("");
      setMessage("");
      window.location.reload();
    } else {
      setError(result.error || "Failed to send");
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" className="gap-1">
        <Plus className="h-4 w-4" /> New Message
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">New Message to Partner</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Question about my payment"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={5}
                placeholder="Type your message..."
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
