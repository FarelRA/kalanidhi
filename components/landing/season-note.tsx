import { Droplets, LandPlot, Sprout } from "lucide-react"

import type { MangsaContent } from "@/lib/content/types"

const activityIcons = [Sprout, Droplets, LandPlot] as const

export function SeasonNote({ mangsa }: { mangsa: MangsaContent }) {
  return (
    <section
      id="mangsa"
      aria-labelledby="season-title"
      className="border-b border-ink/15 bg-cream-2 py-16 sm:py-20 lg:py-24"
    >
      <div className="shell grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-6">
          <span className="stamp border-ink/35 text-ink">{mangsa.label}</span>
          <h2 id="season-title" className="heading-section mt-5 max-w-[18ch]">
            {mangsa.title}
          </h2>
          <p className="body-copy mt-5 max-w-[38rem]">{mangsa.description}</p>
        </div>

        <div className="lg:col-span-6">
          <div className="relative mx-auto max-w-[440px] border-2 border-ink bg-paper-2 p-5 shadow-[7px_7px_0_var(--teak)] sm:p-7 lg:rotate-[0.8deg]">
            <div className="absolute inset-x-0 top-0 h-2 bg-copper" aria-hidden="true" />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 pb-3 pt-2">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                {mangsa.eyebrow}
              </span>
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                {mangsa.season}
              </span>
            </div>

            <p className="mt-5 font-heading text-[clamp(3.2rem,7vw,4.6rem)] leading-none text-ink">
              {mangsa.name}
            </p>
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-copper-dark">
              {mangsa.period}
            </p>

            <div className="mt-6 border-t border-ink/15 pt-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                {mangsa.activityLabel}
              </p>
              <ul className="mt-3 space-y-2.5">
                {mangsa.activities.map((activity, index) => {
                  const Icon = activityIcons[index] ?? Sprout
                  return (
                    <li key={activity} className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center bg-panel text-ink">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="text-[12.5px] text-ink/80">{activity}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <p className="mt-5 border-t border-ink/15 pt-3 text-[10px] leading-relaxed text-ink-muted">
              {mangsa.provenance}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
