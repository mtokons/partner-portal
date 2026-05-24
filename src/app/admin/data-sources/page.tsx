import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAllSpLists,
  fetchTenantUsers,
  fetchAppUsers,
  fetchDataSourceDiagnostics,
  fetchFeatureMapping,
} from "./actions";
import DataSourcesClient from "./client";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function DataSourcesPage() {
  await requireAdmin();
  const [diag, listsRes, tenantUsers, appUsers, mapping] = await Promise.all([
    fetchDataSourceDiagnostics(),
    fetchAllSpLists(),
    fetchTenantUsers(100),
    fetchAppUsers(),
    fetchFeatureMapping(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <p className="text-sm text-muted-foreground">
          Inspect every SharePoint list and user directory the application uses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connection</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">LIVE CONNECTION</Badge>
            <Badge variant={diag.hasConfig ? "default" : "destructive"}>
              {diag.hasConfig ? "Graph credentials present" : "Missing Graph credentials"}
            </Badge>
            <Badge variant="outline">env: {diag.env || "unknown"}</Badge>
          </div>
          <p className="text-muted-foreground text-xs">Site: {diag.siteUrl ?? "(not set)"}</p>
          <p className="text-muted-foreground text-xs">App URL: {diag.appUrl ?? "(not set)"}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="mapping">
        <TabsList>
          <TabsTrigger value="mapping">Feature Mapping ({mapping.spLists.length})</TabsTrigger>
          <TabsTrigger value="sp-lists">SharePoint Lists ({listsRes.lists.length})</TabsTrigger>
          <TabsTrigger value="app-users">Application Users ({appUsers.total})</TabsTrigger>
          <TabsTrigger value="tenant-users">Tenant Users ({tenantUsers.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="mapping">
          <FeatureMapping mapping={mapping} />
        </TabsContent>

        <TabsContent value="sp-lists">
          <DataSourcesClient lists={listsRes.lists} listsError={listsRes.error} />
        </TabsContent>

        <TabsContent value="app-users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Users (Firestore)</CardTitle>
            </CardHeader>
            <CardContent>
              {appUsers.error ? (
                <p className="text-sm text-red-600">Error: {appUsers.error}</p>
              ) : (
                <DataTable columns={appUsers.columns} rows={appUsers.rows} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant-users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Microsoft 365 Tenant Users (Graph /users)</CardTitle>
            </CardHeader>
            <CardContent>
              {tenantUsers.error ? (
                <p className="text-sm text-red-600">Error: {tenantUsers.error}</p>
              ) : (
                <DataTable columns={tenantUsers.columns} rows={tenantUsers.rows} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, unknown>> }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows.</p>;
  }
  return (
    <div className="overflow-auto border rounded-md max-h-[600px]">
      <table className="text-xs w-full">
        <thead className="bg-muted sticky top-0">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-2 py-1.5 font-semibold border-b">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="even:bg-muted/30">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1 align-top border-b">
                  <CellValue value={r[c]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  if (typeof value === "number") return <span>{value}</span>;
  if (typeof value === "string") {
    if (value.length > 200) return <span title={value}>{value.slice(0, 200)}…</span>;
    return <span>{value}</span>;
  }
  try {
    return <span className="font-mono text-[10px]">{JSON.stringify(value)}</span>;
  } catch {
    return <span>—</span>;
  }
}

interface MappingProps {
  mapping: Awaited<ReturnType<typeof fetchFeatureMapping>>;
}

function FeatureMapping({ mapping }: MappingProps) {
  // Group SP lists by their canonical group.
  const groups = new Map<string, typeof mapping.spLists>();
  for (const l of mapping.spLists) {
    const arr = groups.get(l.group) ?? [];
    arr.push(l);
    groups.set(l.group, arr);
  }
  const groupOrder = [
    "CRM", "Commerce", "Financials", "Sales", "Promotions", "Referrals",
    "Wallet", "Identity", "Notifications", "AI", "Sessions", "School", "Tasks",
  ];
  const orderedGroups = groupOrder.filter((g) => groups.has(g));
  const totalLists = mapping.spLists.length;
  const presentLists = mapping.spLists.filter((l) => !l.missing).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature → Data Source Mapping</CardTitle>
          <p className="text-xs text-muted-foreground">
            The canonical list of every SharePoint list and Firestore collection this app reads or writes.
            Updated automatically whenever the registry in <code>app-lists.ts</code> changes.
          </p>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="default">{presentLists}/{totalLists} SP lists present</Badge>
            <Badge variant="outline">{mapping.firestore.length} Firestore collections</Badge>
            {totalLists - presentLists > 0 && (
              <Badge variant="destructive">{totalLists - presentLists} missing</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {orderedGroups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-sm">{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto border rounded-md">
              <table className="text-xs w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold border-b w-44">List</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b">Description</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b">Used by</th>
                    <th className="text-right px-2 py-1.5 font-semibold border-b w-20">Items</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.get(group)!.map((l) => (
                    <tr key={l.name} className="even:bg-muted/30">
                      <td className="px-2 py-1 align-top border-b font-medium">{l.name}</td>
                      <td className="px-2 py-1 align-top border-b">{l.description}</td>
                      <td className="px-2 py-1 align-top border-b">
                        <div className="flex gap-1 flex-wrap">
                          {l.usedBy.map((u) => (
                            <Badge key={u} variant="outline" className="text-[10px]">{u}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-top border-b text-right tabular-nums">
                        {l.itemCount ?? "—"}
                      </td>
                      <td className="px-2 py-1 align-top border-b">
                        {l.missing ? (
                          <Badge variant="destructive" className="text-[10px]">missing</Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">ok</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Firestore collections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border rounded-md">
            <table className="text-xs w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold border-b w-48">Collection</th>
                  <th className="text-left px-2 py-1.5 font-semibold border-b">Description</th>
                  <th className="text-left px-2 py-1.5 font-semibold border-b">Used by</th>
                </tr>
              </thead>
              <tbody>
                {mapping.firestore.map((c) => (
                  <tr key={c.name} className="even:bg-muted/30">
                    <td className="px-2 py-1 align-top border-b font-medium font-mono">{c.name}</td>
                    <td className="px-2 py-1 align-top border-b">{c.description}</td>
                    <td className="px-2 py-1 align-top border-b">
                      <div className="flex gap-1 flex-wrap">
                        {c.usedBy.map((u) => (
                          <Badge key={u} variant="outline" className="text-[10px]">{u}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
