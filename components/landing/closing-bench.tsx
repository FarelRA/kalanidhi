import Link from "next/link"

import { BrandMark } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import type { SectionCopy, TractionView } from "@/lib/content/types"
import { interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"

export function ClosingBench({
  traction,
  copy,
}: {
  traction: TractionView
  copy: SectionCopy["closing"]
}) {
  return (
    <section
      aria-labelledby="closing-title"
      className="wood-deep relative overflow-hidden pb-24 pt-20 text-paper sm:pt-24"
    >
      <div className="shell relative z-10 grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <span className="stamp border-paper/35 text-paper">{copy.label}</span>
          <h2 id="closing-title" className="heading-hero mt-6 max-w-[15ch] text-paper">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-paper/75">
            {copy.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="border-2 border-copper-dark bg-copper-dark text-cream-2 hover:border-copper hover:bg-copper"
            >
              <Link href={interestHref({ intent: "student" })}>
                {copy.primaryCta}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-paper/35 text-paper hover:border-brass hover:bg-paper/5 hover:text-brass"
            >
              <Link href={PUBLIC_ROUTES.paths}>{copy.secondaryCta}</Link>
            </Button>
          </div>

          {traction.figures.length > 0 ? (
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-t border-paper/20 pt-5 sm:grid-cols-5">
              {traction.figures.map((figure) => (
                <div key={figure.label}>
                  <dt className="font-heading text-[1.55rem] leading-none text-brass">
                    {figure.value}
                  </dt>
                  <dd className="mt-1.5 text-[9px] font-bold uppercase leading-tight tracking-[0.07em] text-paper/65">
                    {figure.label}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-10 max-w-xl border-t border-paper/20 pt-5 text-[11px] leading-relaxed text-paper/65">
              Belum ada capaian yang bisa dihitung dari Convex.
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-paper/20 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-paper/65">
              {traction.label}
            </p>
            <p className="text-[10.5px] leading-relaxed text-paper/65">
              {traction.note} {copy.noteSuffix}
            </p>
          </div>
        </div>

        <div className="hidden justify-center lg:col-span-5 lg:flex">
          <div className="relative size-[300px]">
            <BrandMark size={300} tone="paper" className="opacity-20" />
          </div>
        </div>
      </div>

      <div className="bench-plank absolute inset-x-0 bottom-0 h-4" aria-hidden="true" />
    </section>
  )
}
