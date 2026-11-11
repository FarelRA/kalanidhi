"use client"

import * as React from "react"

import { EmptyState } from "@/components/workspace/data/empty-state"
import {
  FilterBar,
  type FilterGroup,
} from "@/components/workspace/data/filter-bar"
import { cn } from "cn"

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  headClassName?: string
  align?: "left" | "right" | "center"
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  caption,
  filters = [],
  searchPlaceholder,
  getSearchText,
  filterRow,
  emptyTitle = "Belum ada baris",
  emptyDescription,
  emptyAction,
  toolbar,
  footer,
  minWidth = 720,
  rowClassName,
  className,
}: {
  rows: T[]
  columns: Column<T>[]
  caption: string
  filters?: FilterGroup[]
  searchPlaceholder?: string
  getSearchText?: (row: T) => string
  filterRow?: (row: T, values: Record<string, string>) => boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  minWidth?: number
  rowClassName?: (row: T) => string
  className?: string
}) {
  const [query, setQuery] = React.useState("")
  const [values, setValues] = React.useState<Record<string, string>>({})

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle) {
        const haystack = getSearchText
          ? getSearchText(row)
          : Object.values(row as Record<string, unknown>)
              .filter((value) => typeof value === "string")
              .join(" ")
        if (!haystack.toLowerCase().includes(needle)) return false
      }
      if (filterRow && !filterRow(row, values)) return false
      return true
    })
  }, [rows, query, values, getSearchText, filterRow])

  const showFilters =
    filters.length > 0 || Boolean(searchPlaceholder) || Boolean(toolbar)

  return (
    <div className={cn("min-w-0", className)}>
      {showFilters ? (
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          values={values}
          onFilterChange={(id, value) =>
            setValues((current) => ({ ...current, [id]: value }))
          }
          onClear={() => {
            setQuery("")
            setValues({})
          }}
          actions={toolbar}
          resultCount={filtered.length}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="border-t-0"
        />
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table
            className="w-full border-collapse text-left"
            style={{ minWidth }}
          >
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-ink/25 bg-panel/55">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.headClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-ink/10 align-top transition-colors hover:bg-panel/30 focus-within:bg-panel/30",
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-3 py-3 text-[12px] leading-snug text-ink",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/15 bg-paper/40 px-3 py-2 text-[10px] text-ink-muted">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
