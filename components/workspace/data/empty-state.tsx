import type * as React from "react"
import { Inbox } from "lucide-react"

import { cn } from "cn"

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-ink/25 bg-paper/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center border border-ink/20 text-ink-muted">
        {icon ?? <Inbox className="size-4" aria-hidden="true" />}
      </span>
      <p className="mt-4 font-heading text-lg text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
