import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { buildPageMetadata } from "@/lib/content/metadata"
import { interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.institution, {
    title: data.institution.title,
    description: data.institution.description,
    alternates: { canonical: PUBLIC_ROUTES.institution },
  })
}

export default async function InstitutionPage() {
  const data = await getSiteData()
  const institution = data.institution

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow={institution.label}
          title={institution.title}
          description={institution.description}
        >
          <ul className="mt-6 flex flex-wrap gap-2">
            {institution.segments.map((segment) => (
              <li
                key={segment}
                className="inline-flex min-h-9 items-center border border-ink/30 bg-cream-2 px-3 text-[11px] font-semibold text-ink/75"
              >
                {segment}
              </li>
            ))}
          </ul>
        </PublicPageIntro>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="grid gap-3 sm:grid-cols-2">
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

            <div className="mt-8 border-t border-ink/15 pt-4">
              <p className="text-[10.5px] leading-relaxed text-ink-muted">
                Ingin membaca etika dan hak budaya sebelum menyusun program?{" "}
                <Link
                  href={PUBLIC_ROUTES.ethics}
                  className="font-semibold text-copper-dark underline underline-offset-2"
                >
                  Baca prinsip etika
                </Link>
                .
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="relative border-2 border-ink bg-paper-2 p-5 shadow-[7px_7px_0_var(--teak)] sm:p-6">
              <div
                className="absolute inset-x-0 top-0 h-2 bg-copper"
                aria-hidden="true"
              />
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

              <Link
                href={interestHref({ intent: "institution" })}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
              >
                {institution.cta}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-ink-muted">
                {institution.note}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
