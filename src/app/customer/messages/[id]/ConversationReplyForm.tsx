"use client";

import { useState } from "react";
import { replyToConversation } from "@/app/customer/candidate-actions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ConversationReplyForm({ ticketId }: { ticketId: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError("");

    const result = await replyToConversation(ticketId, message.trim());
    setSending(false);

    if (result.success) {
      setMessage("");
      window.location.reload();
    } else {
      setError(result.error || "Failed to send");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="Type your reply..."
          required
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <Button type="submit" disabled={sending} size="sm" className="mb-1 gap-1">
        <Send className="h-4 w-4" />
        {sending ? "..." : "Reply"}
      </Button>
    </form>
  );
}
