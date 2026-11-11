import { cn } from "cn"

import type { StatusTone } from "@/lib/workspace/types"

const toneClass: Record<StatusTone, string> = {
  open: "text-copper-dark",
  progress: "text-thread",
  done: "text-moss",
  wait: "text-[#8a5a16]",
  danger: "text-[#9a3423]",
  muted: "text-ink-muted",
}

export function StatusStamp({
  label,
  tone = "open",
  className,
  shape,
}: {
  label: string
  tone?: StatusTone
  className?: string
  shape?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap border px-1.5 py-1 text-[9px] font-bold uppercase leading-none tracking-[0.09em]",
        toneClass[tone],
        className,
      )}
    >
      <StatusShape tone={tone} hidden={shape === false} />
      {label}
    </span>
  )
}

export function StatusShape({
  tone,
  hidden,
  className,
}: {
  tone: StatusTone
  hidden?: boolean
  className?: string
}) {
  if (hidden) return null

  if (tone === "danger") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block size-1.5 rotate-45 bg-current", className)}
      />
    )
  }

  if (tone === "progress") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]",
          className,
        )}
      />
    )
  }

  if (tone === "done") {
    return (
      <span
        aria-hidden="true"
        className={cn("relative inline-block size-1.5 bg-current", className)}
      >
        <span className="absolute -top-1 left-0.5 h-2 w-1 rotate-45 border-r border-b border-paper" />
      </span>
    )
  }

  if (tone === "muted" || tone === "wait") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 border border-current",
          tone === "wait" && "bg-current/20",
          className,
        )}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 bg-current", className)}
    />
  )
}
