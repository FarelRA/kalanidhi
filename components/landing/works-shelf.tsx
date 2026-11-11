import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { LeadButton } from "@/components/overlays/overlay-buttons"
import type { SectionCopy, Work } from "@/lib/content/types"
import { formatIDR } from "@/lib/format"

export function WorksShelf({
  works,
  copy,
}: {
  works: Work[]
  copy: SectionCopy["works"]
}) {
  const featured = works[0]
  const rest = works.slice(1)

  return (
    <section
      id="karya"
      aria-labelledby="works-title"
      className="border-b border-ink/15 bg-panel py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">{copy.label}</span>
            <h2 id="works-title" className="heading-section mt-5 max-w-[17ch]">
              {copy.title}
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] lg:col-span-5">
            {copy.description}
          </p>
        </div>

        <article className="mt-12 grid gap-8 border-2 border-ink bg-paper-2 p-4 shadow-[5px_5px_0_var(--teak)] sm:p-6 lg:mt-16 lg:grid-cols-12 lg:gap-10 lg:p-8">
          <figure className="relative lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden border border-ink/20 bg-cream">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                sizes="(min-width: 1024px) 640px, 92vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted">
              <span>{featured.unit}</span>
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                Kartu Karya {featured.workCard}
              </span>
            </figcaption>
          </figure>

          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {featured.kind === "service" ? copy.serviceLabel : copy.featuredLabel}
            </p>
            <h3 className="mt-2 font-heading text-[clamp(1.7rem,3.2vw,2.4rem)] leading-[1.03]">
              {featured.title}
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-ink/70">
              {featured.description}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-ink/15 py-3 text-[11.5px]">
              {[
                ["Pembuat", featured.maker],
                ["Pengajar", featured.teacher],
                ["Teknik", `${featured.technique} / ${featured.techniqueNote}`],
                ["Daerah", featured.region],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold leading-snug text-ink/85">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {featured.priceLabel ?? copy.priceLabel}
                </p>
                <p className="mt-1 font-heading text-[1.8rem] leading-none">
                  {formatIDR(featured.price)}
                </p>
              </div>
              <LeadButton
                request={{ variant: "consultation", interest: featured.title }}
                variant="outline"
                className="border-ink/35"
              >
                {copy.askCta}
                <ArrowRight aria-hidden="true" />
              </LeadButton>
            </div>
          </div>
        </article>

        <ul className="mt-8 border-t border-ink/20">
          {rest.map((work) => (
            <li
              key={work.slug}
              className="flex gap-4 border-b border-ink/20 py-5 sm:gap-5"
            >
              <div className="relative size-[76px] shrink-0 overflow-hidden border border-ink/20 bg-cream sm:size-24">
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <h3 className="font-heading text-[1.18rem] leading-tight">
                    {work.title}
                  </h3>
                  <p className="text-[12px] font-semibold text-ink/80">
                    {work.priceLabel ? `${work.priceLabel} ` : ""}
                    {formatIDR(work.price)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                  {work.maker}, {work.makerRole.toLowerCase()}
                </p>
                <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-muted">
                  <span>Pengajar {work.teacher}</span>
                  <span>
                    {work.technique} / {work.techniqueNote}
                  </span>
                  <span className="stamp stamp-soft border-ink/30 text-ink-muted">
                    {work.workCard}
                  </span>
                </p>
                <LeadButton
                  request={{ variant: "consultation", interest: work.title }}
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto min-h-9 px-0 text-copper-dark hover:bg-transparent hover:text-ink"
                >
                  {copy.askCta}
                  <ArrowRight aria-hidden="true" />
                </LeadButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
