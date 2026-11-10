import Image from "next/image"

import { WorkCardPreview } from "@/components/landing/work-card-preview"
import { Button } from "@/components/ui/button"
import { hero } from "@/lib/content/landing"

export function Hero() {
  return (
    <section
      id="beranda"
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-paper/10"
    >
      <div
        aria-hidden="true"
        className="decorative-glow pointer-events-none absolute -right-40 top-0 h-[46rem] w-[46rem] rounded-full bg-indigo-dust/[0.07] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="texture-crackle pointer-events-none absolute inset-0 opacity-[0.045]"
      />

      <div className="section-shell relative grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="lg:col-span-6">
          <h1 id="hero-title" className="heading-display">
            {hero.title[0]}
            <br />
            {hero.title[1]}
            <br />
            {hero.title[2]}
          </h1>

          <p className="body-copy mt-7 max-w-[46ch]">{hero.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Button asChild size="lg">
              <a href="#jalur">{hero.primaryCta}</a>
            </Button>
            <a
              href="#karya"
              className="border-b border-soga/60 pb-0.5 text-[13px] text-paper transition-colors hover:border-paper hover:text-soga"
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <div className="hero-plate relative mx-auto w-full max-w-[30rem] lg:mr-2 lg:ml-auto">
            <div className="relative aspect-[4/3] overflow-hidden border border-paper/20 bg-ink-2 shadow-plate">
              <Image
                src={hero.image}
                alt="Proses membatik dengan canting dan kain soga"
                fill
                priority
                placeholder="blur"
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/10" />
            </div>

            <div className="mt-3 border-t border-paper/15 pt-3 text-[10px] leading-relaxed">
              <span className="text-soga">Foto 01</span>
            </div>

            <div className="hero-slip relative z-10 mt-5 sm:absolute sm:-bottom-4 sm:-left-10 sm:mt-0 sm:w-[17rem]">
              <WorkCardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
