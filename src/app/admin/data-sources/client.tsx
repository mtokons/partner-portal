"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchSpListItems } from "./actions";

interface SpListSummary {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  itemCount?: number;
  template?: string;
  hidden?: boolean;
  appGroup?: string;
  appUsedBy?: string[];
  appDescription?: string;
}

export default function DataSourcesClient({
  lists,
  listsError,
}: {
  lists: SpListSummary[];
  listsError?: string;
}) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<SpListSummary | null>(null);
  const [items, setItems] = useState<{ columns: string[]; rows: Array<Record<string, unknown>> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = lists.filter(
    (l) =>
      !l.hidden &&
      (filter.length === 0 || l.displayName.toLowerCase().includes(filter.toLowerCase()))
  );

  function open(list: SpListSummary) {
    setSelected(list);
    setItems(null);
    setError(null);
    start(async () => {
      const res = await fetchSpListItems(list.id, 50);
      if (res.error) setError(res.error);
      else setItems({ columns: res.columns, rows: res.rows });
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Lists</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {listsError && <p className="text-xs text-red-600">{listsError}</p>}
          <div className="max-h-[600px] overflow-auto divide-y border rounded-md">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => open(l)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                  selected?.id === l.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{l.displayName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {l.itemCount ?? "?"}
                  </Badge>
                </div>
                {l.appGroup && (
                  <Badge variant="secondary" className="text-[10px] mt-1">{l.appGroup}</Badge>
                )}
                {(l.appDescription || l.description) && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {l.appDescription || l.description}
                  </p>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">No lists.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{selected ? selected.displayName : "Select a list"}</CardTitle>
              {selected?.description && (
                <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
              )}
            </div>
            {selected?.webUrl && (
              <a
                href={selected.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                Open in SharePoint ↗
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selected && (
            <p className="text-sm text-muted-foreground">Pick a list on the left to view rows.</p>
          )}
          {pending && <p className="text-sm">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {items && (
            <>
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <span>{items.rows.length} rows shown (max 50)</span>
                {selected && selected.itemCount !== undefined && (
                  <Badge variant="outline">{selected.itemCount} total</Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selected && open(selected)}
                  className="ml-auto h-7 text-xs"
                >
                  Refresh
                </Button>
              </div>
              {items.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rows.</p>
              ) : (
                <div className="overflow-auto border rounded-md max-h-[600px]">
                  <table className="text-xs w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {items.columns.map((c) => (
                          <th key={c} className="text-left px-2 py-1.5 font-semibold border-b">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.rows.map((r, i) => (
                        <tr key={i} className="even:bg-muted/30">
                          {items.columns.map((c) => (
                            <td key={c} className="px-2 py-1 align-top border-b max-w-[280px]">
                              <CellValue value={r[c]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  if (typeof value === "number") return <span>{value}</span>;
  if (typeof value === "string") {
    if (value.length > 200) return <span title={value}>{value.slice(0, 200)}…</span>;
    return <span className="break-words">{value}</span>;
  }
  try {
    return <span className="font-mono text-[10px]">{JSON.stringify(value)}</span>;
  } catch {
    return <span>—</span>;
  }
}
