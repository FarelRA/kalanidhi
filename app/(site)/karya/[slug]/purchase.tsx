"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { PublicWorkView } from "@/lib/commerce/types"
import { buyHref, interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { formatIDR } from "@/lib/format"

/**
 * Viewer-dependent purchase CTA. The session is read in the browser so the
 * work page can stay fully static and an unknown slug can return a real 404.
 */
export function WorkPurchase({ work }: { work: PublicWorkView }) {
  const viewer = useQuery(api.access.getViewer)
  const signedIn = Boolean(viewer)
  const checkoutHref = signedIn
    ? buyHref(work.slug)
    : `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(buyHref(work.slug))}`

  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {work.priceLabel ? (
          <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {work.priceLabel}
          </p>
        ) : null}
        <p className="mt-1 font-heading text-[1.9rem] leading-none">
          {formatIDR(work.price)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={interestHref({
            work: work.slug,
            intent: "consultation",
          })}
          className="inline-flex min-h-12 items-center gap-2 border border-ink/35 px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
        >
          Tanya karya ini
        </Link>
        {work.purchasable ? (
          <Link
            href={checkoutHref}
            className="inline-flex min-h-12 items-center gap-2 border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
          >
            {signedIn ? "Beli karya ini" : "Masuk untuk membeli"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
