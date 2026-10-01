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
}

export function MultiSelectCombobox({
  values,
  onChange,
  options,
  placeholder = "Select options...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No results found.",
  required = false,
  disabled = false,
  className,
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOptions = React.useMemo(() => {
    return options.filter((opt) => values.includes(opt.id));
  }, [options, values]);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel?.toLowerCase().includes(query);
      const matchBadge = opt.badge?.toLowerCase().includes(query);
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, search]);

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
    }
  }, [isOpen]);

  const handleSelect = (option: ComboboxOption) => {
    if (values.includes(option.id)) {
      handleRemove(option.id);
    } else {
      const newValues = [...values, option.id];
      const newSelected = [...selectedOptions, option];
      onChange(newValues, newSelected);
    }
  };

  const handleRemove = (idToRemove: string) => {
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

      <div
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-slate-400 dark:hover:border-slate-600",
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-input"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground truncate flex-1 h-6 flex items-center">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-md px-2 py-0.5 text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handleRemove(opt.id);
              }}
            >
              {opt.label}
              <button
                type="button"
                className="hover:bg-indigo-200 dark:hover:bg-indigo-500/20 rounded-full p-0.5 transition-colors focus:outline-none"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}

        <div className="ml-auto flex items-center self-start h-6 pt-0.5 text-muted-foreground">
          <ChevronsUpDown className="h-4 w-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="ml-1 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[250px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                    )}
                    onClick={() => handleSelect(opt)}
                  >
                    <div className="flex flex-1 items-center gap-3 overflow-hidden">
                      {opt.icon && <div className="text-muted-foreground shrink-0">{opt.icon}</div>}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="truncate text-xs text-muted-foreground">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="ml-auto shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-border">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <div className="ml-3 shrink-0 flex items-center justify-center w-4">
                      {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
