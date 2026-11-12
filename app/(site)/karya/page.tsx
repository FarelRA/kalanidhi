import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { getPublicWorks } from "@/lib/commerce/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  buyHref,
  interestHref,
  PUBLIC_ROUTES,
  workHref,
} from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"
import { formatIDR } from "@/lib/format"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.works, {
    title: data.sections.works.title,
    description: data.sections.works.description,
    alternates: { canonical: PUBLIC_ROUTES.works },
  })
}

export default async function WorksPage() {
  const [data, works] = await Promise.all([
    getSiteData(),
    getPublicWorks(),
  ])
  const copy = data.sections.works

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow={copy.label}
          title={copy.title}
          description={copy.description}
        />

        {works.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            Belum ada karya terbit di Convex. Karya akan muncul di sini setelah
            Kartu Karya dan sertifikat platformnya terbit.
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <li
                key={work.slug}
                className="flex flex-col border-2 border-ink bg-paper-2 shadow-[5px_5px_0_var(--teak)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-ink/15 bg-panel">
                  {work.image ? (
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, 92vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-copper-dark">
                    {work.kind === "service" ? copy.serviceLabel : copy.featuredLabel}
                  </p>
                  <h2 className="mt-1.5 font-heading text-[1.35rem] leading-tight">
                    <Link
                      href={workHref(work.slug)}
                      className="hover:text-copper-dark"
                    >
                      {work.title}
                    </Link>
                  </h2>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                    {work.maker}, {work.region}
                  </p>
                  <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                    {work.description}
                  </p>

                  <div className="mt-3 border-t border-ink/15 pt-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                      {work.priceLabel ?? copy.priceLabel}
                    </p>
                    <p className="mt-1 font-heading text-[1.5rem] leading-none">
                      {formatIDR(work.price)}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href={workHref(work.slug)}
                      className="inline-flex min-h-11 items-center border border-ink/35 px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
                    >
                      Buka karya
                    </Link>
                    {work.purchasable ? (
                      <Link
                        href={buyHref(work.slug)}
                        className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                      >
                        Pesan
                      </Link>
                    ) : (
                      <span className="max-w-44 text-[9.5px] leading-relaxed text-ink-muted">
                        Karya kurasi platform. Hubungi pengelola untuk pembelian.
                      </span>
                    )}
                    <Link
                      href={interestHref({
                        work: work.slug,
                        intent: "consultation",
                      })}
                      className="inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
                    >
                      {copy.askCta}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
