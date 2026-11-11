"use client"

import { cn } from "cn"

export type TabItem = {
  id: string
  label: string
  count?: number
}

export function SegmentedTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-1 flex gap-0 overflow-x-auto border-b border-ink/20",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
              active
                ? "-mb-px border-copper-dark text-ink"
                : "border-transparent text-ink-muted hover:border-ink/25 hover:text-ink",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "min-w-4 border px-1 py-0.5 text-center text-[8.5px] tabular-nums",
                  active
                    ? "border-copper-dark/35 text-copper-dark"
                    : "border-ink/15 text-ink-muted",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
