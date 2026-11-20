import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ShieldCheck } from "lucide-react"

import { CulturalSources } from "@/components/landing/cultural-sources"
import { formatIDR } from "@/lib/format"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import { getPublicWork, getPublicWorks } from "@/lib/commerce/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import { getSiteData } from "@/lib/convex/server"
import { PUBLIC_ROUTES, workHref } from "@/lib/content/routes"

import { WorkPurchase } from "./purchase"

export const instant = false
export const ensureStatic = "navigation"

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const works = await getPublicWorks()
  return works.length > 0
    ? works.map((work) => ({ slug: work.slug }))
    : [{ slug: "__placeholder__" }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const work = await getPublicWork(slug)
  if (!work) notFound()
  return buildPageMetadata(workHref(work.slug), {
    title: work.title,
    description: work.description.slice(0, 160),
    alternates: { canonical: workHref(work.slug) },
    openGraph: {
      title: work.title,
      description: work.description.slice(0, 160),
      ...(work.image ? { images: [work.image] } : {}),
    },
  })
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const [work, data] = await Promise.all([getPublicWork(slug), getSiteData()])
  if (!work) notFound()
  const directSources = data.culturalSources.filter(
    (source) => source.workSlug === work.slug,
  )
  const classSources =
    directSources.length === 0 && work.pathId
      ? data.culturalSources.filter(
          (source) => source.pathSlug === work.pathId,
        )
      : []
  const workSources = directSources.length > 0 ? directSources : classSources

  return (
    <div className="bg-cream">
      <section aria-labelledby="karya-title" className="shell py-12 sm:py-16">
        <nav aria-label="Remah roti" className="text-[10px] text-ink-muted">
          <Link href={PUBLIC_ROUTES.home} className="hover:text-copper-dark">
            Beranda
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={PUBLIC_ROUTES.works} className="hover:text-copper-dark">
            Karya
          </Link>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden border-2 border-ink bg-panel shadow-[5px_5px_0_var(--teak)]">
              {work.image ? (
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 640px, 92vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted">
              <span>{work.unit}</span>
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                Kartu Karya {work.workCard}
              </span>
            </figcaption>
          </figure>

          <div className="lg:col-span-5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {work.kind === "service" ? "Jasa" : "Karya"} · {work.region}
            </p>
            <h1
              id="karya-title"
              className="heading-section mt-3 text-[clamp(2rem,4vw,3rem)]"
            >
              {work.title}
            </h1>
            <p className="body-copy mt-4">{work.description}</p>

            <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-ink/15 py-4 text-[11.5px]">
              {[
                ["Pembuat", work.maker],
                ["Peran", work.makerRole],
                ["Pengajar", work.teacher],
                ["Teknik", work.technique],
                ["Catatan teknik", work.techniqueNote],
                ["Satuan", work.unit],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold leading-snug text-ink/85">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-muted">
              <ShieldCheck
                className="mt-0.5 size-3.5 shrink-0 text-moss"
                aria-hidden="true"
              />
              {work.permission}
            </p>

            <WorkPurchase work={work} />
          </div>
        </div>

        <section
          aria-labelledby="bagi-hasil-title"
          className="mt-12 border border-ink/20 bg-paper-2 p-5 sm:p-7"
        >
          <h2
            id="bagi-hasil-title"
            className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-copper-dark"
          >
            Bagi hasil sebelum transaksi
          </h2>
          <div className="mt-3 flex h-6 border border-ink/25" aria-hidden="true">
            <span
              className="h-full bg-copper-dark"
              style={{ width: `${SPLIT_PERCENTAGES.teacher}%` }}
            />
            <span
              className="h-full bg-ink"
              style={{ width: `${SPLIT_PERCENTAGES.platform}%` }}
            />
            <span
              className="h-full bg-moss"
              style={{ width: `${SPLIT_PERCENTAGES.community}%` }}
            />
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["Pembuat", SPLIT_PERCENTAGES.teacher, work.split.teacherShare],
              ["Platform", SPLIT_PERCENTAGES.platform, work.split.platformShare],
              ["Komunitas", SPLIT_PERCENTAGES.community, work.split.communityShare],
            ].map(([label, percent, value]) => (
              <div key={String(label)}>
                <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                  {label} {percent}%
                </dt>
                <dd className="mt-1 text-[12px] font-semibold tabular-nums">
                  {formatIDR(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-ink/15 pt-3 text-[10.5px] leading-relaxed text-ink-muted">
            Biaya gerbang pembayaran diserap dari bagian platform. Nominal unik
            pada checkout adalah penanda rekonsiliasi, bukan tambahan pendapatan.
          </p>
        </section>

        <div className="mt-6">
          <CulturalSources sources={workSources} title="Sumber karya" />
        </div>
      </section>
    </div>
  )
}

