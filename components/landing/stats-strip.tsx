import { stats } from "@/lib/content/landing"
import { formatNumber } from "@/lib/format"

export function StatsStrip() {
  return (
    <section
      aria-label="Ringkasan capaian KalaNidhi"
      className="border-b border-paper/10 bg-ink-2/50"
    >
      <div className="section-shell py-12 sm:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-soga">Catatan komunitas</p>
          <p className="text-[11px] text-text-muted">Per September 2026</p>
        </div>

        <div className="grid grid-cols-2 gap-y-8 sm:gap-x-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-paper/12">
          {stats.map((stat) => {
            const spoken = `${stat.prefix ?? ""}${formatNumber(stat.value)}${stat.suffix ?? ""}`

            return (
              <div
                key={stat.label}
                className="px-0 lg:px-6 lg:first:pl-0 lg:last:pr-0"
              >
                <p className="sr-only">
                  {stat.label}: {spoken}
                </p>
                <div
                  aria-hidden="true"
                  className="font-heading text-[2.4rem] leading-none tracking-[-0.02em] text-paper sm:text-[3rem]"
                >
                  {stat.prefix}
                  {formatNumber(stat.value)}
                  {stat.suffix}
                </div>
                <p className="mt-3 text-[12px] font-medium text-paper">
                  {stat.label}
                </p>
                <p className="mt-1 max-w-[24ch] text-[11px] leading-relaxed text-text-muted">
                  {stat.note}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
