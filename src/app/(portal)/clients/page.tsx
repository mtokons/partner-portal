import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getClients } from "@/lib/sharepoint";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AddClientButton from "./AddClientButton";
import { Users, Building2, Mail, Phone, ExternalLink, UserPlus, RefreshCw } from "lucide-react";
import { refreshClientsAction } from "./actions";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const clients = await getClients(user.role === "admin" ? undefined : user.partnerId);

  // Avatar color map based on client index
  const avatarGradients = [
    "from-blue-400 to-blue-600",
    "from-violet-400 to-violet-600",
    "from-emerald-400 to-emerald-600",
    "from-orange-400 to-orange-500",
    "from-rose-400 to-rose-600",
    "from-teal-400 to-teal-600",
    "from-amber-400 to-amber-500",
    "from-cyan-400 to-cyan-600",
  ];

  return (
    <div className="space-y-7 page-enter">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-1 rounded-full gradient-green" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Clients
            </p>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Client Directory</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{clients.length} active client{clients.length !== 1 ? "s" : ""} in your portfolio</p>
        </div>
        {user.role === "partner" && (
          <div className="flex items-center gap-3">
            <form action={async () => { "use server"; await refreshClientsAction(); }}>
              <button 
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border/50 text-muted-foreground rounded-2xl font-semibold text-sm hover:text-foreground transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </form>
            <AddClientButton partnerId={user.partnerId} />
          </div>
        )}
        {user.role === "admin" && (
          <form action={async () => { "use server"; await refreshClientsAction(); }}>
            <button 
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border/50 text-muted-foreground rounded-2xl font-semibold text-sm hover:text-foreground transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </form>
        )}
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Clients", value: clients.length, gradient: "gradient-green" },
          { label: "With Company", value: clients.filter(c => c.company).length, gradient: "gradient-blue" },
          { label: "With Email", value: clients.filter(c => c.email).length, gradient: "gradient-purple" },
        ].map((s) => (
          <div key={s.label} className={`kpi-card ${s.gradient}`}>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white leading-none">{s.value}</p>
              <p className="text-sm text-white/70 mt-1.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Clients Table ── */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Client List
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">All registered clients</p>
          </div>
          {user.role === "partner" && (
            <div className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline">
              <UserPlus className="h-3.5 w-3.5" />
              Add client
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 bg-muted/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-6">Client</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Since</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, idx) => (
                  <TableRow key={client.id} className="table-row-hover border-border/40">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarGradients[idx % avatarGradients.length]} flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm`}>
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground/70">#{client.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.company ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-sm text-foreground">{client.company}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            <span className="text-xs text-muted-foreground">{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </TableCell>
                    <TableCell className="pr-6">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 hover:bg-primary hover:text-white hover:border-primary transition-all">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No clients yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Add your first client to get started</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
