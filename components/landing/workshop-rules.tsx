import { BadgeCheck, BookMarked, HandCoins, LockKeyhole } from "lucide-react"

import { ethics } from "@/lib/content/landing"
import { cn } from "cn"

const principleIcons = [BookMarked, LockKeyhole, HandCoins] as const

const shareStyles = [
  "bg-copper text-cream-2",
  "bg-moss text-cream-2",
  "bg-brass text-ink",
] as const

export function WorkshopRules() {
  return (
    <section
      id="etika"
      aria-labelledby="ethics-title"
      className="wood-deep border-b border-ink/30 py-16 text-paper sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-paper/35 text-paper">{ethics.label}</span>
            <h2 id="ethics-title" className="heading-section mt-5 max-w-[18ch] text-paper">
              {ethics.title}
            </h2>
          </div>
          <p className="max-w-[34rem] text-[14.5px] leading-relaxed text-paper/70 lg:col-span-5">
            {ethics.description}
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <ul className="space-y-6">
              {ethics.principles.map((principle, index) => {
                const Icon = principleIcons[index] ?? BookMarked
                return (
                  <li key={principle.title} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center border border-paper/30 bg-paper/5 text-brass">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-heading text-[1.35rem] leading-tight text-paper">
                        {principle.title}
                      </h3>
                      <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-paper/65">
                        {principle.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-8 flex items-start gap-3 border-t border-paper/20 pt-5">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden="true" />
              <p className="max-w-[50ch] text-[11.5px] leading-relaxed text-paper/65">
                Sertifikat diterbitkan KalaNidhi Digital sebagai sertifikat
                platform, dengan kode verifikasi publik. Ini bukan sertifikasi
                pemerintah atau BNSP.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative border-2 border-ink bg-paper-2 p-5 text-ink shadow-[8px_8px_0_rgba(0,0,0,0.28)] sm:p-6 lg:rotate-[1.1deg]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/20 pb-3">
                <span className="stamp stamp-soft border-ink/45 text-ink">
                  Kartu Sumber Budaya
                </span>
                <span className="stamp border-moss bg-moss text-cream-2">
                  {ethics.attribution.access}
                </span>
              </div>
              <ul className="mt-4 divide-y divide-ink/15 border-y border-ink/15">
                {ethics.attribution.sources.map((source) => (
                  <li key={source.name} className="flex items-start gap-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center border border-ink/30 bg-cream text-[10px] font-bold tracking-[0.08em] text-ink">
                      {source.initials}
                    </span>
                    <div>
                      <p className="font-heading text-[1.25rem] leading-tight">
                        {source.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                        {source.field}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Izin
                  </dt>
                  <dd className="mt-0.5 text-[12px] leading-snug text-ink/75">
                    {ethics.attribution.permission}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Rujukan
                  </dt>
                  <dd className="mt-0.5 text-[12px] leading-snug text-ink/75">
                    {ethics.attribution.reference}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/15 pt-3">
                {ethics.accessLevels.map((level) => (
                  <span
                    key={level.label}
                    className={cn(
                      "inline-flex min-h-7 items-center border px-2 text-[9.5px] font-bold uppercase tracking-[0.06em]",
                      level.label === ethics.attribution.access
                        ? "border-moss bg-moss/10 text-moss"
                        : "border-ink/25 text-ink-muted",
                    )}
                  >
                    {level.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 border-2 border-paper/25 p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-heading text-[1.3rem] text-paper">
                  Bagi hasil
                </h3>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-paper/65">
                  Ditampilkan sebelum transaksi
                </p>
              </div>

              <div
                className="mt-4 flex h-16 overflow-hidden border-2 border-paper/40"
                role="img"
                aria-label="Bagi hasil 70 persen untuk pengajar dan pembuat karya, 15 persen untuk dana komunitas dan sanggar, 15 persen untuk operasional platform"
              >
                {ethics.share.map((item, index) => (
                  <div
                    key={item.label}
                    style={{ width: `${item.value}%` }}
                    className={cn(
                      "flex items-center justify-center border-r-2 border-paper/35 last:border-r-0",
                      shareStyles[index] ?? "bg-copper text-cream-2",
                    )}
                  >
                    <span className="font-heading text-[1.35rem] font-semibold leading-none sm:text-[1.7rem]">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>

              <ul className="mt-5 space-y-3">
                {ethics.share.map((item, index) => (
                  <li key={item.label} className="grid grid-cols-[10px_1fr_auto] gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2.5",
                        shareStyles[index]?.split(" ")[0] ?? "bg-copper",
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-[12px] font-semibold text-paper/90">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-paper/65">
                        {item.note}
                      </p>
                    </div>
                    <span className="font-heading text-[1.1rem] text-brass">
                      {item.value}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
