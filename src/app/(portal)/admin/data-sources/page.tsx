import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAllSpLists, fetchTenantUsers, fetchAppUsers, fetchDataSourceDiagnostics } from "./actions";
import DataSourcesClient from "./client";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function DataSourcesPage() {
  await requireAdmin();
  const [diag, listsRes, tenantUsers, appUsers] = await Promise.all([
    fetchDataSourceDiagnostics(),
    fetchAllSpLists(),
    fetchTenantUsers(100),
    fetchAppUsers(),
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
            <Badge variant={diag.useMock ? "destructive" : "default"}>
              {diag.useMock ? "MOCK MODE" : "LIVE"}
            </Badge>
            <Badge variant={diag.hasConfig ? "default" : "destructive"}>
              {diag.hasConfig ? "Graph credentials present" : "Missing Graph credentials"}
            </Badge>
            <Badge variant="outline">env: {diag.env || "unknown"}</Badge>
          </div>
          <p className="text-muted-foreground text-xs">Site: {diag.siteUrl ?? "(not set)"}</p>
          <p className="text-muted-foreground text-xs">App URL: {diag.appUrl ?? "(not set)"}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="sp-lists">
        <TabsList>
          <TabsTrigger value="sp-lists">SharePoint Lists ({listsRes.lists.length})</TabsTrigger>
          <TabsTrigger value="app-users">Application Users ({appUsers.total})</TabsTrigger>
          <TabsTrigger value="tenant-users">Tenant Users ({tenantUsers.total})</TabsTrigger>
        </TabsList>

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
