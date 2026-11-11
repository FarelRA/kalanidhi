import Link from "next/link"
import { ChevronRight, Clock3 } from "lucide-react"

import { StatusStamp } from "@/components/workspace/data/status-stamp"
import type { QueueItem } from "@/lib/workspace/types"
import { cn } from "cn"

export function QueueList({
  items,
  className,
  emptyLabel = "Antrean bersih.",
}: {
  items: QueueItem[]
  className?: string
  emptyLabel?: string
}) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-ink/20 px-4 py-8 text-center text-[12px] text-ink-muted">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className={cn("divide-y divide-ink/10 border-y border-ink/10", className)}>
      {items.map((item) => {
        const content = (
          <>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold leading-snug text-ink">
                  {item.title}
                </span>
                <StatusStamp label={item.status} tone={item.tone} />
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
                {item.meta}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-3 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" aria-hidden="true" />
                  {item.age}
                </span>
                <span>{item.owner}</span>
              </span>
            </span>
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
          </>
        )

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex min-h-14 items-start gap-3 px-1 py-3.5 transition-colors hover:bg-panel/35 focus-visible:bg-panel/35"
              >
                {content}
              </Link>
            ) : (
              <div className="flex min-h-14 items-start gap-3 px-1 py-3.5">
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
