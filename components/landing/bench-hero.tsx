import Image from "next/image"

import { Button } from "@/components/ui/button"
import type { HeroContent, HeroWorkCard } from "@/lib/content/types"

export function BenchHero({
  hero,
  workCard,
}: {
  hero: HeroContent
  workCard: HeroWorkCard | null
}) {
  return (
    <section
      aria-labelledby="hero-title"
      className="wood-deep relative overflow-hidden text-paper"
    >
      <div className="shell relative grid gap-14 pb-24 pt-14 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-32 lg:pt-24">
        <div className="lg:col-span-6">
          <h1 id="hero-title" className="heading-hero text-paper">
            {hero.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-7 max-w-[56ch] text-[16px] leading-[1.68] text-paper/80 sm:text-[16.5px]">
            {hero.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="border-2 border-copper-dark bg-copper-dark text-cream-2 hover:border-copper hover:bg-copper"
            >
              <a href="#jalur">{hero.primaryCta}</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-paper/35 text-paper hover:border-brass hover:bg-paper/5 hover:text-brass"
            >
              <a href="#lingkaran">{hero.secondaryCta}</a>
            </Button>
          </div>
        </div>

        <div className="relative lg:col-span-6 lg:pl-8">
          <figure className="relative mx-auto max-w-[560px]">
            <div className="hero-photo paper-frame border-[10px] border-[#e7d5b8] bg-[#e7d5b8] [--photo-rot:-1.4deg]">
              <div className="relative aspect-[4/3] overflow-hidden bg-teak">
                {hero.plate.image ? (
                  <Image
                    src={hero.plate.image}
                    alt={hero.plate.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 560px, 92vw"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-cream-2">
                    {hero.plate.caption}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-cream-2/70">
                    {hero.plate.note}
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-tag relative z-10 mx-auto -mt-10 w-[min(94%,340px)] border-2 border-ink bg-paper-2 p-4 text-ink shadow-[8px_8px_0_#20130d] sm:absolute sm:-bottom-12 sm:left-1 sm:mt-0 sm:w-[310px] [--tag-rot:2.4deg]">
              <div className="tag-hole flex items-center justify-between gap-3 border-b border-ink/20 pb-2.5 pl-6">
                <span className="stamp stamp-soft border-ink/45 text-ink">
                  {hero.workCard.title}
                </span>
                <span className="text-[10px] font-bold tracking-[0.08em] text-ink/70">
                  {workCard ? workCard.serial : "Belum dipilih"}
                </span>
              </div>
              {workCard ? (
                <>
                  <p className="mt-3 pl-6 font-heading text-[1.15rem] leading-tight">
                    {workCard.work}
                  </p>
                  <dl className="mt-3 grid gap-1.5 pl-6 text-[10.5px] leading-snug">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Pembuat</dt>
                      <dd className="font-semibold">{workCard.maker}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Pengajar</dt>
                      <dd className="font-semibold">{workCard.teacher}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-3 pl-6 text-[10.5px] leading-snug text-ink-muted">
                  Kartu Karya hero belum dipilih. Pilih karya dari halaman
                  pilihan landing.
                </p>
              )}
            </div>
          </figure>

          <div className="ruler mt-8 hidden text-brass/70 sm:block" aria-hidden="true" />
        </div>
      </div>

      <div className="bench-plank absolute inset-x-0 bottom-0 h-3" aria-hidden="true" />
    </section>
  )
}
