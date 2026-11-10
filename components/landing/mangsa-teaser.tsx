import { Droplets, Sun, Wind } from "lucide-react"

import { MangsaWheel } from "@/components/landing/mangsa-wheel"
import { InfoButton } from "@/components/overlays/overlay-buttons"
import { mangsa } from "@/lib/content/landing"

const metricIcons = {
  sun: Sun,
  droplets: Droplets,
  wind: Wind,
} as const

export function MangsaTeaser() {
  return (
    <section
      id="mangsa"
      aria-labelledby="mangsa-title"
      className="border-b border-paper/10 bg-[#3a3530] py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="section-label">{mangsa.eyebrow}</p>
          </div>

          <h2 id="mangsa-title" className="heading-section mt-4">
            {mangsa.title}
          </h2>

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="text-soga">{mangsa.season}</span>
            <span className="h-3 w-px bg-paper/20" aria-hidden="true" />
            <span className="text-paper">{mangsa.name}</span>
            <span className="h-3 w-px bg-paper/20" aria-hidden="true" />
            <span className="text-text-muted">{mangsa.period}</span>
          </p>

          <p className="body-copy mt-5 max-w-[52ch]">{mangsa.description}</p>

          <dl className="mt-7 border-t border-paper/12">
            {mangsa.metrics.map((metric) => {
              const Icon = metricIcons[metric.icon]
              return (
                <div
                  key={metric.label}
                  className="flex items-center justify-between gap-4 border-b border-paper/12 py-3"
                >
                  <dt className="flex items-center gap-2.5 text-[11px] text-text-muted">
                    <Icon className="size-3.5 text-soga" aria-hidden="true" />
                    {metric.label}
                  </dt>
                  <dd className="text-[12px] text-paper">{metric.value}</dd>
                </div>
              )
            })}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <InfoButton infoKey="mangsa" size="sm">
              Lihat kalender mangsa
            </InfoButton>
            <InfoButton
              infoKey="policy"
              variant="ghost"
              size="sm"
              className="border-0 border-b border-paper/25 px-0 text-paper-dim hover:bg-transparent hover:text-paper"
            >
              Sumber & izin
            </InfoButton>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="mx-auto max-w-[34rem]">
            <MangsaWheel />
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-paper/12 pt-3 text-[10px] text-text-muted">
              <span>Aktivitas musim</span>
              <span className="text-right text-paper-dim">
                {mangsa.activities.join(" / ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
