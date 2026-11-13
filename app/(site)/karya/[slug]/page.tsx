import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { ArrowRight, ShieldCheck } from "lucide-react"

import type { PublicWorkView } from "@/lib/commerce/types"
import { formatIDR } from "@/lib/format"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import { getPublicWork } from "@/lib/commerce/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  buyHref,
  interestHref,
  PUBLIC_ROUTES,
  workHref,
} from "@/lib/content/routes"

export const instant = false

type Params = { slug: string }

async function isSignedIn(): Promise<boolean> {
  if (!isAuthConfigured()) return false
  try {
    return await getAuthServer().isAuthenticated()
  } catch (error) {
    console.error("[karya] Could not resolve auth session.", error)
    return false
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const work = await getPublicWork(slug)
  if (!work) {
    return { title: "Karya tidak ditemukan" }
  }
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
  const work = await getPublicWork(slug)
  if (!work) notFound()

  return (
    <div className="bg-cream">
      <section aria-labelledby="karya-title" className="shell py-12 sm:py-16">
        <nav aria-label="Remah roti" className="text-[10px] text-ink-muted">
          <Link href={PUBLIC_ROUTES.home} className="hover:text-copper-dark">
            Beranda
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Karya</span>
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
                ["Bahan", work.techniqueNote],
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

            <Suspense
              fallback={<WorkPurchaseView work={work} signedIn={false} />}
            >
              <WorkPurchase work={work} />
            </Suspense>
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
              ["Pengrajin", SPLIT_PERCENTAGES.teacher, work.split.teacherShare],
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
      </section>
    </div>
  )
}

async function WorkPurchase({ work }: { work: PublicWorkView }) {
  // Reading the session during prerender makes the auth fetch reject once the
  // static shell is done, so resolve it only when a request arrives.
  await connection()
  const signedIn = await isSignedIn()
  return <WorkPurchaseView work={work} signedIn={signedIn} />
}

function WorkPurchaseView({
  work,
  signedIn,
}: {
  work: PublicWorkView
  signedIn: boolean
}) {
  const checkoutHref = signedIn
    ? buyHref(work.slug)
    : `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(buyHref(work.slug))}`

  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {work.priceLabel ? (
          <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {work.priceLabel}
          </p>
        ) : null}
        <p className="mt-1 font-heading text-[1.9rem] leading-none">
          {formatIDR(work.price)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={interestHref({
            work: work.slug,
            intent: "consultation",
          })}
          className="inline-flex min-h-12 items-center gap-2 border border-ink/35 px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
        >
          Tanya karya ini
        </Link>
        {work.purchasable ? (
          <Link
            href={checkoutHref}
            className="inline-flex min-h-12 items-center gap-2 border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
          >
            {signedIn ? "Beli karya ini" : "Masuk untuk membeli"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <p className="max-w-56 border border-ink/20 bg-panel/40 px-3 py-2 text-[10px] leading-relaxed text-ink-muted">
            Karya kurasi platform. Hubungi pengelola untuk pembelian.
          </p>
        )}
      </div>
    </div>
  )
}
