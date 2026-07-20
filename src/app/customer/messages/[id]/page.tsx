import { getEffectiveSession } from "@/lib/effective-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyConversation } from "@/app/customer/candidate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Shield } from "lucide-react";
import ConversationReplyForm from "./ConversationReplyForm";

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/customer-login");

  const { id } = await params;
  const { ticket, messages } = await getMyConversation(id);

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Link href="/customer/messages" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Messages
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Conversation not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customer/messages" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
            <Badge className={statusColor[ticket.status] || "bg-gray-100"}>
              {ticket.status}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {ticket.sccgId} &middot; {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>

      {/* Original message */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{ticket.submittedByName}</span>
                <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString("en-GB")}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className={msg.isStaff ? "border-blue-200 bg-blue-50/30" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    msg.isStaff ? "bg-blue-100" : "bg-purple-100"
                  }`}>
                    {msg.isStaff ? (
                      <Shield className="h-4 w-4 text-blue-600" />
                    ) : (
                      <User className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{msg.senderName}</span>
                      {msg.isStaff && <Badge variant="outline" className="text-xs">Partner</Badge>}
                      <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString("en-GB")}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Form */}
      {ticket.status !== "closed" && (
        <ConversationReplyForm ticketId={ticket.id} />
      )}
    </div>
  );
}
