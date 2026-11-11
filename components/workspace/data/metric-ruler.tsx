import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import type { Metric } from "@/lib/workspace/types"
import { cn } from "cn"

export function MetricRuler({
  metric,
  className,
}: {
  metric: Metric
  className?: string
}) {
  const max = Math.max(...metric.series, 1)
  const direction = metric.direction ?? "flat"
  const DeltaIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus

  return (
    <figure
      className={cn(
        "relative flex min-w-0 flex-col justify-between border border-ink/20 bg-paper-2 p-4",
        className,
      )}
    >
      <figcaption className="text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-ink-muted">
        {metric.label}
      </figcaption>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-heading text-[1.55rem] leading-none tracking-tight text-ink tabular-nums">
          {metric.value}
        </p>
        {metric.delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 pb-0.5 text-[10px] font-bold tabular-nums",
              direction === "up" && "text-moss",
              direction === "down" && "text-[#9a3423]",
              direction === "flat" && "text-ink-muted",
            )}
          >
            <DeltaIcon className="size-3" aria-hidden="true" />
            {metric.delta}
          </span>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="mt-4 flex h-8 items-end gap-[3px] border-b border-ink/30 pb-0.5"
      >
        {metric.series.map((value, index) => (
          <span
            key={`${metric.id}-${index}`}
            className={cn(
              "min-h-[2px] flex-1",
              index === metric.series.length - 1 ? "bg-copper-dark" : "bg-copper/35",
            )}
            style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-ink-muted">
        {metric.note}
      </p>
    </figure>
  )
}

export function MetricStrip({
  metrics,
  className,
}: {
  metrics: Metric[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {metrics.map((metric) => (
        <MetricRuler key={metric.id} metric={metric} />
      ))}
    </div>
  )
}
