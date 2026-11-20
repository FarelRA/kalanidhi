import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { SPLIT_PERCENTAGES, splitAmount } from "@/lib/commerce/money"
import { isCommerceConfigured } from "@/lib/commerce/server"
import { pathHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { getPublicPath, getPublicPaths } from "@/lib/convex/server"
import { formatIDR } from "@/lib/format"
import { isAuthConfigured } from "@/lib/auth-server"

import { CheckoutGate } from "../../checkout-gate"

export const instant = false
export const ensureStatic = "navigation"

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const paths = await getPublicPaths()
  return paths.length > 0
    ? paths.map((path) => ({ slug: path.slug }))
    : [{ slug: "__placeholder__" }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const path = await getPublicPath(slug)
  if (!path) notFound()
  return {
    title: `Pesan ${path.title}`,
    robots: { index: false, follow: false },
  }
}

export default async function PathCheckoutPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const path = await getPublicPath(slug)
  if (!path) notFound()

  if (!isCommerceConfigured()) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Checkout kelas
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Checkout belum tersambung.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Sistem pesanan belum dikonfigurasi pada lingkungan ini. Hubungi
            pengelola melalui halaman kontak untuk menyelesaikan pesanan.
          </p>
          <Link
            href={PUBLIC_ROUTES.home}
            className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    )
  }

  if (!isAuthConfigured()) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Checkout kelas
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Masuk belum tersambung.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Checkout memerlukan akun, tetapi layanan masuk belum dikonfigurasi
            pada lingkungan ini. Hubungi pengelola untuk menyelesaikan pesanan.
          </p>
          <Link
            href={pathHref(slug)}
            className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            Kembali ke kelas
          </Link>
        </div>
      </div>
    )
  }

  if (path.comingSoon || path.price === null || path.price <= 0) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Kelas belajar
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Pembelian belum dibuka.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Kelas ini belum memiliki harga atau kurikulum yang siap dibeli.
            Hubungi pengelola untuk informasi ketersediaan.
          </p>
          <Link
            href={pathHref(path.slug)}
            className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            Kembali ke kelas
          </Link>
        </div>
      </div>
    )
  }

  const split = splitAmount(path.price)

  return (
    <div className="bg-cream">
      <section aria-labelledby="checkout-title" className="shell py-12 sm:py-16">
        <Link
          href={pathHref(path.slug)}
          className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-ink-muted hover:text-copper-dark"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Kembali ke kelas
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden border border-ink/20 bg-panel">
              {path.image ? (
                <Image
                  src={path.image}
                  alt={path.title}
                  fill
                  sizes="(min-width: 1024px) 520px, 92vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="mt-3 text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              Kelas belajar · {path.region}
            </p>
            <h1
              id="checkout-title"
              className="heading-section mt-2 text-[clamp(1.9rem,3.6vw,2.8rem)]"
            >
              {path.title}
            </h1>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
              {path.subtitle}
            </p>
            <dl className="mt-4 space-y-2 border-t border-ink/15 pt-3 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Pengajar</dt>
                <dd className="font-semibold">{path.teacher}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Level</dt>
                <dd className="font-semibold">{path.level}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Isi</dt>
                <dd className="font-semibold">
                  {path.modules} modul · {path.lessons} pelajaran
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Harga</dt>
                <dd className="font-semibold tabular-nums">
                  {formatIDR(path.price)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border border-ink/20 bg-panel/30 p-3">
              <div className="flex h-4 border border-ink/25" aria-hidden="true">
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
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
                <div>
                  <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Pengajar {SPLIT_PERCENTAGES.teacher}%
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {formatIDR(split.teacherShare)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Platform {SPLIT_PERCENTAGES.platform}%
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {formatIDR(split.platformShare)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Komunitas {SPLIT_PERCENTAGES.community}%
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {formatIDR(split.communityShare)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
                Pembagian dihitung dari harga dasar sebelum biaya gerbang.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <CheckoutGate
              kind="path"
              slug={path.slug}
              title={path.title}
              price={path.price}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
