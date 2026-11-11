import { cn } from "cn"

import type { ActivityItem } from "@/lib/workspace/types"

const dotTone: Record<ActivityItem["type"], string> = {
  audit: "bg-ink",
  payment: "bg-copper",
  content: "bg-brass",
  auth: "bg-ink-muted",
  call: "bg-moss",
  support: "bg-[#8a5a16]",
}

export function ActivityFeed({
  items,
  className,
}: {
  items: ActivityItem[]
  className?: string
}) {
  return (
    <ol
      className={cn(
        "relative ml-2 border-l border-ink/20 pl-5",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 -left-[25px] size-2 border border-paper-2",
              dotTone[item.type],
            )}
          />
          <p className="text-[11.5px] leading-relaxed text-ink">
            <span className="font-semibold">{item.actor}</span>{" "}
            <span className="text-ink-soft">{item.action}</span>{" "}
            <span className="font-medium">{item.target}</span>
          </p>
          <p className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {item.time}
          </p>
        </li>
      ))}
    </ol>
  )
}
