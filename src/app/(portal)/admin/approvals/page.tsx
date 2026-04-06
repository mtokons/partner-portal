import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { FirebaseUserProfile } from "@/lib/firebase-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import ApprovalButtons from "./ApprovalButtons";

export default async function AdminApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  // Fetch all pending users from Firestore
  const db = getAdminFirestore();
  const snapshot = await db.collection("users").where("status", "==", "pending").get();
  
  const pendingUsers: FirebaseUserProfile[] = [];
  snapshot.forEach((doc) => {
    pendingUsers.push(doc.data() as FirebaseUserProfile);
  });

  // Sort by newest first
  pendingUsers.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Access Approvals</h1>
        <p className="text-white/50 text-sm mt-1">Review and approve partners and experts waiting for portal access.</p>
      </div>

      <Card className="bg-[#0c1024] border-white/10 shadow-2xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            Pending Applications
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              {pendingUsers.length} waiting
            </Badge>
          </CardTitle>
          <CardDescription className="text-white/40">
            Admins must approve these users before they can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-white/40 uppercase text-xs tracking-wider font-semibold py-4 pl-6">Applicant</TableHead>
                <TableHead className="text-white/40 uppercase text-xs tracking-wider font-semibold py-4">Role</TableHead>
                <TableHead className="text-white/40 uppercase text-xs tracking-wider font-semibold py-4">Company/Spec</TableHead>
                <TableHead className="text-white/40 uppercase text-xs tracking-wider font-semibold py-4">Applied</TableHead>
                <TableHead className="text-white/40 uppercase text-xs tracking-wider font-semibold py-4 pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-white/30 text-sm">
                    No pending applications. You're all caught up!
                  </TableCell>
                </TableRow>
              ) : (
                pendingUsers.map((applicant) => (
                  <TableRow key={applicant.uid} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="pl-6 py-4">
                      <p className="font-semibold text-white/90">{applicant.displayName}</p>
                      <p className="text-xs text-white/50 mt-0.5">{applicant.email}</p>
                      {applicant.phone && (
                        <p className="text-xs text-white/30">{applicant.phone}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="capitalize bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {applicant.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      {applicant.role === "partner" && applicant.company ? (
                        <span className="text-sm text-white/70 flex items-center gap-2">
                          <span className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-[10px]">🏢</span>
                          {applicant.company}
                        </span>
                      ) : applicant.role === "expert" && applicant.specialization ? (
                        <span className="text-sm text-white/70 flex items-center gap-2">
                          <span className="h-5 w-5 rounded bg-white/5 flex items-center justify-center text-[10px]">🛡️</span>
                          {applicant.specialization}
                        </span>
                      ) : (
                        <span className="text-sm text-white/30 italic">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-white/50">
                        {applicant.createdAt?.toMillis 
                          ? formatDistanceToNow(applicant.createdAt.toMillis(), { addSuffix: true }) 
                          : "Recently"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 py-4">
                      <div className="flex justify-end">
                        <ApprovalButtons uid={applicant.uid} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
