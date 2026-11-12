import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { CheckoutForm } from "@/components/commerce/checkout-form"
import { formatIDR } from "@/lib/format"
import { getPublicWork, isCommerceConfigured } from "@/lib/commerce/server"

export const instant = false

type Params = { slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const work = await getPublicWork(slug)
  return {
    title: work ? `Pesan ${work.title}` : "Checkout",
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params

  if (!isCommerceConfigured()) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Checkout
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Checkout belum tersambung.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Sistem pesanan belum dikonfigurasi pada lingkungan ini. Hubungi
            pengelola melalui halaman kontak untuk menyelesaikan pesanan.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    )
  }

  const work = await getPublicWork(slug)
  if (!work) notFound()

  if (!work.purchasable) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Karya kurasi
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Pembelian belum dibuka.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Karya ini ditampilkan sebagai kurasi platform. Hubungi pengelola
            untuk menghubungkan penjual dan membuka pembelian.
          </p>
          <Link
            href={`/karya/${work.slug}`}
            className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            Kembali ke karya
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cream">
      <section aria-labelledby="checkout-title" className="shell py-12 sm:py-16">
        <Link
          href={`/karya/${work.slug}`}
          className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-ink-muted hover:text-copper-dark"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Kembali ke karya
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden border border-ink/20 bg-panel">
              {work.image ? (
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  sizes="(min-width: 1024px) 520px, 92vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="mt-3 text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {work.kind === "service" ? "Jasa" : "Karya"} · {work.region}
            </p>
            <h1
              id="checkout-title"
              className="heading-section mt-2 text-[clamp(1.9rem,3.6vw,2.8rem)]"
            >
              {work.title}
            </h1>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
              {work.description}
            </p>
            <dl className="mt-4 space-y-2 border-t border-ink/15 pt-3 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Pembuat</dt>
                <dd className="font-semibold">{work.maker}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Pengajar</dt>
                <dd className="font-semibold">{work.teacher}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Kartu Karya</dt>
                <dd className="text-[10px] tabular-nums">{work.workCard}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Harga</dt>
                <dd className="font-semibold tabular-nums">{formatIDR(work.price)}</dd>
              </div>
            </dl>

            <div className="mt-4 border border-ink/20 bg-panel/30 p-3">
              <div className="flex h-4 border border-ink/25" aria-hidden="true">
                <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
                <span className="h-full bg-ink" style={{ width: "15%" }} />
                <span className="h-full bg-moss" style={{ width: "15%" }} />
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
                Pembagian 70% pengrajin, 15% platform, 15% komunitas dihitung
                dari harga dasar sebelum biaya gerbang.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <CheckoutForm
              slug={work.slug}
              title={work.title}
              price={work.price}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
