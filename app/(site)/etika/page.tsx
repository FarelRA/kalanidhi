import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { WorkshopRules } from "@/components/landing/workshop-rules"
import { buildPageMetadata } from "@/lib/content/metadata"
import { interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.ethics, {
    title: data.ethics.title,
    description: data.ethics.description,
    alternates: { canonical: PUBLIC_ROUTES.ethics },
  })
}

export default async function EthicsPage() {
  const data = await getSiteData()
  const policy = data.overlays.policy

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow={data.ethics.label}
          title={data.ethics.title}
          description={data.ethics.description}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="space-y-3">
              {(policy.bullets ?? []).map((bullet) => (
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
          </div>
          <aside className="lg:col-span-5">
            <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)]">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                Tingkat akses
              </p>
              <dl className="mt-3 space-y-3">
                {data.ethics.accessLevels.map((level) => (
                  <div
                    key={level.label}
                    className="border-b border-ink/15 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-[11.5px] font-semibold text-ink">
                      {level.label}
                    </dt>
                    <dd className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
                      {level.note}
                    </dd>
                  </div>
                ))}
              </dl>
              {policy.action ? (
                <Link
                  href={interestHref({
                    intent: policy.action.lead.variant,
                    interest: policy.action.lead.interest,
                  })}
                  className="mt-4 inline-flex min-h-11 items-center text-[10.5px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
                >
                  {policy.action.label}
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <WorkshopRules ethics={data.ethics} sources={data.culturalSources} />
    </div>
  )
}
