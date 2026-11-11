import type * as React from "react"

import { cn } from "cn"

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: string
  eyebrow?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        "min-w-0 border border-ink/20 bg-paper-2 shadow-[3px_3px_0_rgba(32,19,13,0.06)]",
        className,
      )}
    >
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/15 px-4 py-3.5">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink-muted">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1 font-heading text-[1.25rem] leading-tight text-ink">
                {title}
              </h2>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}
