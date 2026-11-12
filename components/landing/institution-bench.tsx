import Link from "next/link"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { InstitutionContent } from "@/lib/content/types"
import { interestHref } from "@/lib/content/routes"

export function InstitutionBench({ institution }: { institution: InstitutionContent }) {
  return (
    <section
      id="institusi"
      aria-labelledby="institution-title"
      className="border-b border-ink/15 bg-panel py-16 sm:py-20 lg:py-24"
    >
      <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <span className="stamp border-ink/35 text-ink">{institution.label}</span>
          <h2 id="institution-title" className="heading-section mt-5 max-w-[15ch]">
            {institution.title}
          </h2>
          <p className="body-copy mt-5 max-w-[42rem]">{institution.description}</p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {institution.segments.map((segment) => (
              <li
                key={segment}
                className="inline-flex min-h-9 items-center border border-ink/30 bg-cream px-3 text-[11px] font-semibold text-ink/75"
              >
                {segment}
              </li>
            ))}
          </ul>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {institution.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-ink text-paper">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="text-[12px] leading-relaxed text-ink/70">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
          <div className="relative border-2 border-ink bg-paper-2 p-5 shadow-[7px_7px_0_var(--teak)] sm:p-6">
            <div className="absolute inset-x-0 top-0 h-2 bg-copper" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 border-b border-ink/20 pb-3 pt-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                  {institution.summaryLabel}
                </p>
                <p className="mt-1 font-heading text-[1.35rem] leading-tight">
                  {institution.summaryTitle}
                </p>
              </div>
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                {institution.year}
              </span>
            </div>

            <dl className="mt-4 space-y-3">
              {institution.brief.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[96px_1fr] gap-3 border-b border-ink/10 pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="text-[12px] font-semibold leading-snug text-ink/80">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <Button asChild className="mt-6 w-full" size="lg">
              <Link href={interestHref({ intent: "institution" })}>
                {institution.cta}
              </Link>
            </Button>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-muted">
              {institution.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
