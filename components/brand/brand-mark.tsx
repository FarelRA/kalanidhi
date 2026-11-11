import { cn } from "cn"

type BrandMarkProps = {
  className?: string
  size?: number
}

/**
 * A circular bench seen from above, with a finished piece returning to the
 * first station. The loop and the tag in one mark.
 */
export function BrandMark({ className, size = 38 }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
    >
      <circle
        cx="20"
        cy="20"
        r="15.2"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.24"
      />
      <path
        d="M20 5.4a14.6 14.6 0 1 1-10.6 4.6"
        stroke="var(--copper)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="6.7"
        y="6.9"
        width="6.8"
        height="6.8"
        rx="0.8"
        fill="var(--copper-dark)"
        transform="rotate(-10 10.1 10.3)"
      />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  )
}

export function BrandLockup({
  className,
  markSize = 36,
  tone = "ink",
}: {
  className?: string
  markSize?: number
  tone?: "ink" | "paper"
}) {
  const dark = tone === "paper"

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-[1.42rem] font-semibold tracking-[-0.03em]",
            dark ? "text-paper" : "text-ink",
          )}
        >
          KalaNidhi
        </span>
        <span
          className={cn(
            "mt-1 text-[8.5px] font-bold tracking-[0.22em]",
            dark ? "text-paper/60" : "text-ink-muted",
          )}
        >
          DIGITAL
        </span>
      </span>
    </span>
  )
}
