"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComboboxOption } from "./SearchableCombobox";

interface MultiSelectComboboxProps {
  values: string[];
  onChange: (values: string[], selectedOptions: ComboboxOption[]) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  categoryFilter?: string;
}

export function MultiSelectCombobox({
  values,
  onChange,
  options,
  placeholder = "Select assignees...",
  searchPlaceholder = "Search by name, email, role...",
  emptyMessage = "No matching users found.",
  required = false,
  disabled = false,
  className,
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Extract all unique categories/badges for quick filtering tabs
  const categories = React.useMemo(() => {
    const badges = new Set<string>();
    options.forEach((opt) => {
      if (opt.badge) badges.add(opt.badge);
    });
    return ["all", ...Array.from(badges)];
  }, [options]);

  const selectedOptions = React.useMemo(() => {
    // Look up in options first, or keep existing id if not in options
    return values.map((val) => {
      const match = options.find((opt) => opt.id === val);
      return match || { id: val, label: val };
    });
  }, [options, values]);

  const filteredOptions = React.useMemo(() => {
    let list = options;
    if (activeCategory !== "all") {
      list = list.filter((opt) => opt.badge?.toLowerCase() === activeCategory.toLowerCase());
    }
    if (!search.trim()) return list;
    const query = search.toLowerCase().trim();
    return list.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel?.toLowerCase().includes(query);
      const matchBadge = opt.badge?.toLowerCase().includes(query);
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, search, activeCategory]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  const handleToggle = (option: ComboboxOption) => {
    if (values.includes(option.id)) {
      const newValues = values.filter((id) => id !== option.id);
      const newSelected = selectedOptions.filter((opt) => opt.id !== option.id);
      onChange(newValues, newSelected);
    } else {
      const newValues = [...values, option.id];
      const newSelected = [...selectedOptions, option];
      onChange(newValues, newSelected);
    }
  };

  const handleRemove = (idToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newValues = values.filter((id) => id !== idToRemove);
    const newSelected = selectedOptions.filter((opt) => opt.id !== idToRemove);
    onChange(newValues, newSelected);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {required && values.length === 0 && (
        <input
          type="text"
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          required
          tabIndex={-1}
          value=""
          onChange={() => {}}
        />
      )}

      {/* Input box trigger */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm transition-all cursor-pointer",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-400 dark:hover:border-slate-600",
          isOpen ? "border-primary ring-2 ring-primary/20" : "border-input"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground truncate flex-1 h-6 flex items-center">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-semibold shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate max-w-[160px]">{opt.label}</span>
              {opt.badge && (
                <span className="text-[9px] px-1 py-0.2 bg-primary/20 rounded font-normal uppercase">
                  {opt.badge}
                </span>
              )}
              <button
                type="button"
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer"
                disabled={disabled}
                onClick={(e) => handleRemove(opt.id, e)}
                title="Remove assignee"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}

        <div className="ml-auto flex items-center self-center text-muted-foreground pl-1">
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden">
          {/* Category Filter Chips inside dropdown */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-border/60 overflow-x-auto bg-muted/20">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors shrink-0 capitalize cursor-pointer",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {cat === "all" ? "All Users" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div className="flex items-center border-b border-border px-3 py-1.5 bg-muted/10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                }
              }}
            />
            {search && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearch("")}
                className="ml-1 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Option list */}
          <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleToggle(opt)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted/70 text-foreground"
                    )}
                  >
                    <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
                      {opt.icon && <div className="text-muted-foreground shrink-0">{opt.icon}</div>}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="truncate text-xs text-muted-foreground font-normal">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-2.5 flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            opt.badge.toLowerCase().includes("admin")
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                              : opt.badge.toLowerCase().includes("partner")
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : opt.badge.toLowerCase().includes("candidate")
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          )}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
