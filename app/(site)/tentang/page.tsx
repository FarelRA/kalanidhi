import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { BenchLoop } from "@/components/landing/bench-loop"
import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  interestHref,
  PUBLIC_ROUTES,
} from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.about, {
    title: data.overlays.about.title,
    description: data.overlays.about.description,
    alternates: { canonical: PUBLIC_ROUTES.about },
  })
}

export default async function AboutPage() {
  const data = await getSiteData()
  const about = data.overlays.about

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow="Tentang"
          title={about.title}
          description={about.description}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="space-y-3">
              {(about.bullets ?? []).map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 border-b border-ink/15 pb-3 text-[13px] leading-relaxed text-ink-soft"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-ink text-paper">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={interestHref({
                  intent: "consultation",
                  interest: about.action?.lead.interest ?? "Tentang KalaNidhi Digital",
                })}
                className="inline-flex min-h-11 items-center gap-2 border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
              >
                {about.action?.label ?? "Hubungi kami"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={PUBLIC_ROUTES.institution}
                className="inline-flex min-h-11 items-center border border-ink/35 px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
              >
                Untuk institusi
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)]">
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                Sekretariat
              </span>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
                {data.footer.secretariat.value}
              </p>
              <p className="mt-4 border-t border-ink/15 pt-3 text-[10.5px] leading-relaxed text-ink-muted">
                {about.footnote}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <BenchLoop loop={data.loop} />
    </div>
  )
}
