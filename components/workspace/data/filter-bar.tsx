"use client"

import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"

export type FilterGroup = {
  id: string
  label: string
  options: { value: string; label: string; count?: number }[]
}

export function FilterBar({
  query,
  onQueryChange,
  searchPlaceholder = "Cari…",
  filters = [],
  values,
  onFilterChange,
  onClear,
  actions,
  resultCount,
  className,
}: {
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterGroup[]
  values: Record<string, string>
  onFilterChange: (id: string, value: string) => void
  onClear?: () => void
  actions?: React.ReactNode
  resultCount?: number
  className?: string
}) {
  const hasFilters =
    query.length > 0 ||
    filters.some((group) => (values[group.id] ?? "all") !== "all")

  return (
    <div className={cn("border-b border-ink/15 pb-3", className)}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 bg-paper pl-9 text-[12.5px] sm:h-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Bersihkan pencarian"
              className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink sm:size-8"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {filters.map((group) => (
            <div
              key={group.id}
              className="flex min-w-0 flex-wrap items-center gap-1"
              role="group"
              aria-label={group.label}
            >
              {group.options.map((option) => {
                const active = (values[group.id] ?? "all") === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilterChange(group.id, option.value)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors max-lg:min-h-11",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 bg-transparent text-ink-soft hover:border-ink/45 hover:text-ink",
                    )}
                  >
                    {option.label}
                    {typeof option.count === "number" ? (
                      <span
                        className={cn(
                          "text-[9px] tabular-nums",
                          active ? "text-paper/60" : "text-ink-muted",
                        )}
                      >
                        {option.count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 lg:ml-auto">
          {hasFilters && onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Hapus filter
            </Button>
          ) : null}
          {actions}
          {typeof resultCount === "number" ? (
            <span className="ml-auto whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted lg:ml-0">
              {resultCount} baris
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
