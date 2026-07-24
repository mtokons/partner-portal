"use client";

import { useState, useEffect } from "react";
import { DEFAULT_MENUS, type ConsoleType, type MenuItem } from "@/lib/menu-engine";
import { loadMenuOverrides, saveMenuOverrides } from "./actions";
import { Settings, Check, X, GripVertical, Lock, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSOLE_OPTIONS: { value: ConsoleType; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "admin", label: "Admin" },
  { value: "customer", label: "Customer" },
  { value: "expert", label: "Expert" },
  { value: "student", label: "Student" },
];

export default function MenuConfigPage() {
  const [selectedConsole, setSelectedConsole] = useState<ConsoleType>("partner");
  const [menuItems, setMenuItems] = useState<(MenuItem & { _dirty?: boolean })[]>(
    () => [...DEFAULT_MENUS["partner"]]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  // Load overrides when console changes
  useEffect(() => {
    setLoadingOverrides(true);
    loadMenuOverrides(selectedConsole)
      .then((overrides) => {
        const items = [...DEFAULT_MENUS[selectedConsole]];
        // Apply overrides from DB
        for (const ov of overrides) {
          const item = items.find((i) => i.key === ov.menuKey);
          if (item && !item.isLocked) {
            item.isEnabled = ov.isEnabled;
            if (ov.itemOrder) item.itemOrder = ov.itemOrder;
          }
        }
        setMenuItems(items);
      })
      .finally(() => setLoadingOverrides(false));
  }, [selectedConsole]);

  const handleConsoleChange = (console: ConsoleType) => {
    setSelectedConsole(console);
    setSaved(false);
  };

  const toggleItem = (key: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.key === key && !item.isLocked
          ? { ...item, isEnabled: !item.isEnabled, _dirty: true }
          : item
      )
    );
  };

  const resetToDefaults = () => {
    setMenuItems([...DEFAULT_MENUS[selectedConsole]].map((i) => ({ ...i, _dirty: true })));
  };

  // Group items for display
  const groups = new Map<string, (MenuItem & { _dirty?: boolean })[]>();
  for (const item of menuItems) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group)!.push(item);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-muted-foreground" />
            Menu Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize navigation menus for each role. Changes apply to all users with this role.
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Console Selector Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border w-fit">
        {CONSOLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleConsoleChange(opt.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              selectedConsole === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="space-y-6">
        {Array.from(groups.entries()).map(([group, items]) => (
          <div key={group} className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {items[0]?.groupLabel || group}
              </h3>
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 transition-colors",
                    !item.isEnabled && "opacity-50"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                  </div>
                  {item.isLocked ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Locked</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleItem(item.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        item.isEnabled
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      )}
                    >
                      {item.isEnabled ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Enabled
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" /> Disabled
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={async () => {
            setSaving(true);
            setSaved(false);
            const dirtyItems = menuItems.filter((i) => i._dirty);
            if (dirtyItems.length > 0) {
              await saveMenuOverrides(
                selectedConsole,
                dirtyItems.map((i) => ({
                  menuKey: i.key,
                  isEnabled: i.isEnabled,
                  itemOrder: i.itemOrder,
                }))
              );
            }
            setMenuItems((prev) => prev.map((i) => ({ ...i, _dirty: false })));
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }}
          disabled={saving || !menuItems.some((i) => i._dirty)}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="h-4 w-4" /> Saved!</>
          ) : (
            "Save Changes"
          )}
        </button>
        <button
          onClick={resetToDefaults}
          className="px-6 py-2.5 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          Reset to Defaults
        </button>
        {menuItems.some((i) => i._dirty) && (
          <span className="text-xs text-amber-500 font-medium">
            {menuItems.filter((i) => i._dirty).length} unsaved change(s)
          </span>
        )}
      </div>
    </div>
  );
}
