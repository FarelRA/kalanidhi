import { cn } from "cn"

type BrandMarkProps = {
  className?: string
  size?: number
}

/**
 * A wax drop inside a woven frame. Specific to the material language of
 * batik (wax resist, indigo dust, terracotta canting) rather than a generic monogram.
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
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="3"
        stroke="var(--soga)"
        strokeOpacity="0.55"
      />
      <path
        d="M20 8.5c4.3 5.4 7.4 9.1 7.4 13.1a7.4 7.4 0 0 1-14.8 0c0-4 3.1-7.7 7.4-13.1Z"
        fill="var(--paper)"
      />
      <path
        d="M20 8.5c4.3 5.4 7.4 9.1 7.4 13.1a7.4 7.4 0 0 1-14.8 0c0-4 3.1-7.7 7.4-13.1Z"
        stroke="var(--soga)"
        strokeOpacity="0.6"
      />
      <circle cx="20" cy="22" r="2.1" fill="var(--indigo-dust)" />
      <path d="M7 32h8M25 32h8" stroke="var(--soga)" strokeLinecap="round" />
    </svg>
  )
}

export function BrandLockup({
  className,
  markSize = 36,
  inverse = false,
}: {
  className?: string
  markSize?: number
  inverse?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-[1.45rem] tracking-[-0.02em]",
            inverse ? "text-ink" : "text-paper",
          )}
        >
          KalaNidhi
        </span>
      </span>
    </span>
  )
}
