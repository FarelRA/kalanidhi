import type * as React from "react"

import { cn } from "cn"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-ink/20 pb-6 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper-dark">
            <span aria-hidden="true" className="h-px w-8 bg-copper-dark" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="heading-section text-ink">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
