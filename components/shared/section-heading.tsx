import type { ReactNode } from "react"

import { cn } from "cn"

type SectionHeadingProps = {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  align?: "left" | "center"
  className?: string
  titleId?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  titleId,
}: SectionHeadingProps) {
  const centered = align === "center"

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        centered && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-[42rem]", centered && "mx-auto")}>
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <h2 id={titleId} className="heading-section mt-4">
          {title}
        </h2>
        {description ? (
          <p className="body-copy mt-4 max-w-[58ch]">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className={cn("shrink-0", centered && "mt-1")}>{action}</div>
      ) : null}
    </div>
  )
}
