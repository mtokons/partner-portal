import { getEffectiveSession } from "@/lib/effective-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getMyMessages, getMyCandidateRecords } from "@/app/customer/candidate-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import NewMessageButton from "./NewMessageButton";

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export default async function CustomerMessagesPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/customer-login");

  const [tickets, candidates] = await Promise.all([
    getMyMessages(),
    getMyCandidateRecords(),
  ]);

  const defaultCandidateId = candidates[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customer/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500 mt-1">Send queries to your partner</p>
          </div>
        </div>
        <NewMessageButton candidateId={defaultCandidateId} />
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start a conversation with your partner</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/customer/messages/${ticket.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{ticket.subject}</h3>
                        <Badge className={statusColor[ticket.status] || "bg-gray-100"}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{ticket.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
