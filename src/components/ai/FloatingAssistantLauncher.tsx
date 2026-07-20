"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, SendHorizonal, X } from "lucide-react";
import type { ChatMessage } from "@/lib/ai-chat";
import { getAssistantLinks } from "@/lib/ai-assistant-links";

export default function FloatingAssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I can help with the portal, orders, invoices, clients, and expert workflows." },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const assistantLinks = getAssistantLinks();

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;

    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: value }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory, message: value }),
      });
      const data = await res.json();
      setMessages([...nextHistory, { role: "assistant", content: data?.reply || "I’m unable to respond right now." }]);
    } catch {
      setMessages([...nextHistory, { role: "assistant", content: "I’m unable to respond right now." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open && (
        <div className="mb-3 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur">
          <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Portal AI</p>
              <p className="text-xs text-slate-500">Ask anything about the portal</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close assistant chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto bg-slate-50/50 p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[85%]"}>
                <div className={message.role === "user" ? "rounded-2xl bg-indigo-600 px-3 py-2 text-sm text-white" : "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[85%]">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t bg-white p-3">
            <label className="sr-only" htmlFor="portal-assistant-input">Ask the portal assistant</label>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-2">
              <input
                id="portal-assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about orders, invoices, or clients..."
                className="flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-full bg-indigo-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send message"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Open full:</span>
              {assistantLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02]"
        aria-label="Open portal AI chat"
      >
        <Bot className="h-4 w-4" />
        <span>Portal AI</span>
      </button>
    </div>
  );
}
