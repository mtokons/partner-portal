"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { createHelpdeskMessageAction, resolveTicketAction } from "../actions";

interface TicketReplyFormProps {
  ticketId: string;
  isAdmin: boolean;
}

export function TicketReplyForm({ ticketId, isAdmin }: TicketReplyFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    startTransition(async () => {
      await createHelpdeskMessageAction(ticketId, message);
      setMessage("");
    });
  }

  function handleResolve() {
    startTransition(async () => {
      await resolveTicketAction(ticketId);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a reply…"
        className="w-full px-4 py-3 rounded-2xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />
      <div className="flex items-center justify-between">
        {isAdmin && (
          <button
            type="button"
            onClick={handleResolve}
            disabled={isPending}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Mark as Resolved
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Sending…" : "Send Reply"}
        </button>
      </div>
    </form>
  );
}
