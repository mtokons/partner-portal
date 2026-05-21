import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getHelpdeskTickets, getHelpdeskMessages } from "@/lib/sharepoint";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowLeft, User, Shield } from "lucide-react";
import { TicketReplyForm } from "./TicketReplyForm";

export default async function TicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  let partnerId: string | undefined;
  if (!isAdmin) {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) redirect("/partner/pending");
    partnerId = partner.id;
  }

  const tickets = await getHelpdeskTickets(partnerId);
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) notFound();

  const messages = await getHelpdeskMessages(id);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/partner/support"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {ticket.sccgId} · {ticket.category} · {ticket.priority}
          </p>
        </div>
        <span
          className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
            ticket.status === "open"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : ticket.status === "in-progress"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {ticket.status.replace(/-/g, " ")}
        </span>
      </div>

      {/* Original description */}
      <div className="bg-card rounded-2xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{ticket.submittedByName}</span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(ticket.createdAt), "MMM d, yyyy · h:mm a")}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl border p-4 ${
                msg.isStaff
                  ? "bg-primary/5 border-primary/20"
                  : "bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {msg.isStaff ? (
                  <Shield className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {msg.isStaff ? `SCCG Support — ${msg.senderName}` : msg.senderName}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(parseISO(msg.createdAt), "MMM d · h:mm a")}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form — only if not resolved/closed */}
      {ticket.status !== "resolved" && ticket.status !== "closed" && (
        <TicketReplyForm ticketId={id} isAdmin={isAdmin} />
      )}
    </div>
  );
}
