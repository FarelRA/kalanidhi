import Image from "next/image"

import { cn } from "cn"

/**
 * Brand assets derived from the KalaNidhi mark. The source artwork is a cream
 * "K" on a dark wood tile; the app needs the mark on both light and dark
 * surfaces, so both tones ship as transparent, tightly cropped renditions.
 */
const MARK = {
  ink: {
    src: "/brand/kalanidhi-mark-ink.webp",
    width: 774,
    height: 1024,
  },
  paper: {
    src: "/brand/kalanidhi-mark-paper.webp",
    width: 774,
    height: 1024,
  },
} as const

export type BrandTone = keyof typeof MARK

type BrandMarkProps = {
  className?: string
  /** Rendered height in CSS pixels. Width follows the mark's aspect ratio. */
  size?: number
  /** `ink` for light surfaces, `paper` for the dark wood surfaces. */
  tone?: BrandTone
  /** Use `eager` only for a mark that is visible before the first paint. */
  loading?: "lazy" | "eager"
  /** Supply text only when the mark itself carries meaning for screen readers. */
  alt?: string
}

export function BrandMark({
  className,
  size = 38,
  tone = "ink",
  loading,
  alt,
}: BrandMarkProps) {
  const asset = MARK[tone]

  return (
    <Image
      src={asset.src}
      alt={alt ?? ""}
      width={asset.width}
      height={asset.height}
      loading={loading}
      aria-hidden={alt ? undefined : true}
      className={cn("shrink-0 select-none", className)}
      style={{ height: size, width: "auto" }}
    />
  )
}

export function BrandLockup({
  className,
  markSize = 36,
  tone = "ink",
  loading,
}: {
  className?: string
  markSize?: number
  tone?: BrandTone
  loading?: "lazy" | "eager"
}) {
  const dark = tone === "paper"

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} tone={tone} loading={loading} />
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
