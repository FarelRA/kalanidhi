import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import {
  OrderStatusLive,
  OrderStatusStatic,
} from "@/components/commerce/order-status"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import {
  clientKeyFromHeaders,
  statusRateLimiter,
} from "@/lib/commerce/rate-limit"
import {
  getOrderStatus,
  getPaymentStatus,
  isCommerceConfigured,
} from "@/lib/commerce/server"

export const instant = false

type Params = { token: string }

export const metadata: Metadata = {
  title: "Status pesanan",
  robots: { index: false, follow: false, nocache: true },
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { token } = await params

  if (!isCommerceConfigured()) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Pesanan
          </p>
          <h1 className="heading-section mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
            Status pesanan belum tersedia.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Sistem pesanan belum dikonfigurasi pada lingkungan ini. Hubungi
            pengelola dan sebutkan kode pesanan bila kamu sudah melakukan
            pembayaran.
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

  if (token.length < 32) notFound()

  const requestHeaders = await headers()
  const limit = statusRateLimiter.consume(
    clientKeyFromHeaders(new Headers(requestHeaders)),
  )
  if (!limit.allowed) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
            Pesanan
          </p>
          <h1 className="heading-section mt-2 text-[1.9rem]">
            Terlalu banyak permintaan.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            Tunggu sebentar sebelum membuka status pesanan lagi.
          </p>
        </div>
      </div>
    )
  }

  let signedIn = false
  if (isAuthConfigured()) {
    try {
      signedIn = await getAuthServer().isAuthenticated()
    } catch (error) {
      console.error("[pesanan] Could not resolve auth session.", error)
    }
  }

  const [order, payment] = await Promise.all([
    getOrderStatus(token),
    getPaymentStatus(token),
  ])
  if (!order) notFound()

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16" aria-labelledby="status-title">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
          Status pesanan
        </p>
        <h1
          id="status-title"
          className="heading-section mt-2 text-[clamp(2rem,4vw,3rem)]"
        >
          {order.paidAt ? "Pesanan dibayar." : "Selesaikan pembayaran."}
        </h1>
        <p className="body-copy mt-3 max-w-2xl">
          Halaman ini diperbarui dari catatan pesanan, bukan dari laporan
          peramban. Jangan bagikan tautannya; siapa pun yang memegang tautan dapat
          melihat status pesanan ini.
        </p>

        <div className="mt-8">
          {isCommerceConfigured() ? (
            <OrderStatusLive
              token={token}
              initialOrder={order}
              initialPayment={payment}
              signedIn={signedIn}
            />
          ) : (
            <OrderStatusStatic
              token={token}
              order={order}
              payment={payment}
              signedIn={signedIn}
            />
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/15 pt-5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-ink/25 bg-paper-2 px-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink"
          >
            Kembali ke beranda
          </Link>
          <Link
            href={signedIn ? "/ruang/pesanan" : "/masuk"}
            className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.08em] text-paper"
          >
            {signedIn ? "Buka pesanan saya" : "Masuk ke ruang kerja"}
          </Link>
        </div>
      </section>
    </div>
  )
}
