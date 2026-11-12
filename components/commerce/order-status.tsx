"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { Check, Copy, QrCode, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import {
  formatCommerceDateTime,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce/format"
import type { OrderStatusView, PaymentIntentView } from "@/lib/commerce/types"
import type { StatusTone } from "@/lib/workspace/types"
import { formatIDR } from "@/lib/format"

function orderTone(status: string): StatusTone {
  if (status === "completed" || status === "paid") return "done"
  if (status === "disputed") return "danger"
  if (status === "cancelled" || status === "refunded") return "muted"
  if (status === "in_progress" || status === "delivered") return "progress"
  return "wait"
}

function PaymentBlock({
  payment,
  token,
}: {
  payment: PaymentIntentView | null
  token: string
}) {
  const [copied, setCopied] = React.useState(false)
  const [qrImage, setQrImage] = React.useState<{
    payload: string
    url: string
  } | null>(null)
  const qrPayload = payment?.qrString ?? null
  const localQrImage =
    qrImage && qrImage.payload === qrPayload ? qrImage.url : null

  React.useEffect(() => {
    if (!qrPayload || payment?.qrImageUrl) return
    let cancelled = false
    void import("qrcode")
      .then((mod) =>
        mod.toDataURL(qrPayload, {
          margin: 1,
          width: 320,
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (!cancelled) setQrImage({ payload: qrPayload, url })
      })
      .catch(() => {
        // Keep the payload fallback; no local image.
      })
    return () => {
      cancelled = true
    }
  }, [qrPayload, payment?.qrImageUrl])

  if (!payment) {
    return (
      <div className="border border-ink/20 bg-paper-2 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Pembayaran
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
          Tagihan belum dibuat. Muat ulang halaman atau hubungi pengelola dengan
          kode pesanan.
        </p>
      </div>
    )
  }

  const manual = payment.provider === "manual_transfer"
  const settled = payment.status === "paid"

  async function copyPayload() {
    if (!qrPayload) return
    try {
      await navigator.clipboard.writeText(qrPayload)
      setCopied(true)
      toast("Kode QRIS disalin", {
        description: "Tempelkan ke aplikasi pembayaran yang mendukung QRIS teks.",
      })
      window.setTimeout(() => setCopied(false), 2_500)
    } catch {
      toast("Tidak dapat menyalin", { description: "Salin manual dari kotak kode." })
    }
  }

  return (
    <div className="border border-ink/20 bg-paper-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            {manual ? "Transfer manual" : "QRIS"}
          </p>
          <p className="mt-1 font-heading text-2xl leading-none tabular-nums">
            {formatIDR(payment.uniqueAmount)}
          </p>
          {payment.uniqueAmount !== payment.baseAmount ? (
            <p className="mt-1 text-[10px] text-ink-muted">
              Harga dasar {formatIDR(payment.baseAmount)} + penanda rekonsiliasi{" "}
              {formatIDR(payment.uniqueAmount - payment.baseAmount)}
            </p>
          ) : null}
        </div>
        <StatusStamp
          label={PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
          tone={settled ? "done" : payment.status === "pending" ? "wait" : "muted"}
        />
      </div>

      {settled ? (
        <p className="mt-4 border border-moss/40 bg-moss/10 px-3 py-2 text-[11px] text-ink-soft">
          Pembayaran diterima {formatCommerceDateTime(payment.paidAt)}. Pesanan
          diteruskan ke penjual.
        </p>
      ) : payment.status === "pending" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="border border-ink/20 bg-cream p-2">
            {payment.qrImageUrl ? (
              // The gateway may return a rendered QR image in a future adapter.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={payment.qrImageUrl}
                alt={`Kode QRIS untuk pesanan ${payment.orderCode}`}
                className="h-auto w-full"
              />
            ) : localQrImage ? (
              // Rendered locally from the QRIS payload; never sent to a third party.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={localQrImage}
                alt={`Kode QRIS untuk pesanan ${payment.orderCode}`}
                className="h-auto w-full"
              />
            ) : payment.qrString ? (
              <div className="flex min-h-36 items-center justify-center border border-dashed border-ink/25 p-3 text-center">
                <div>
                  <QrCode className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
                  <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
                    Menyiapkan kode QRIS. Bila tidak muncul, salin muatan teks di
                    samping.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-[10.5px] leading-relaxed text-ink-soft">
              Bayar dengan nominal tepat sampai rupiah terakhir. Nominal berbeda
              tidak dapat dicocokkan otomatis.
            </p>
            <p className="mt-2 text-[10px] text-ink-muted">
              Berlaku sampai {formatCommerceDateTime(payment.expiresAt)}.
            </p>
            {payment.qrString ? (
              <>
                <code className="mt-3 block max-h-24 overflow-auto break-all border border-ink/15 bg-cream p-2 text-[9px] leading-relaxed text-ink-soft">
                  {payment.qrString}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={copyPayload}
                >
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "Tersalin" : "Salin kode QRIS"}
                </Button>
              </>
            ) : null}
            {manual ? (
              <p className="mt-3 border border-brass/50 bg-brass/10 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">
                Transfer manual: hubungi pengelola dengan kode{" "}
                <strong>{payment.orderCode}</strong> untuk instruksi rekening.
                Pencocokan dilakukan manual oleh pengelola.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
          Tagihan ini tidak aktif lagi. Hubungi pengelola dengan kode{" "}
          {payment.orderCode} bila dana sudah dikirim.
        </p>
      )}

      <p className="mt-4 flex items-start gap-2 border-t border-ink/15 pt-3 text-[9.5px] leading-relaxed text-ink-muted">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
        Halaman ini hanya membaca catatan Convex. Status pembayaran tidak pernah
        diambil dari klien dan tidak memanggil provider dari peramban.
        <span className="sr-only">{token}</span>
      </p>
    </div>
  )
}

function Timeline({ order }: { order: OrderStatusView }) {
  return (
    <ol className="space-y-2.5">
      {order.timeline.map((entry) => (
        <li key={entry.status} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={`mt-1 size-2 shrink-0 border ${
              entry.at
                ? "border-moss bg-moss"
                : "border-ink/30 bg-transparent"
            }`}
          />
          <div>
            <p className="text-[11px] font-semibold text-ink">{entry.label}</p>
            <p className="text-[9.5px] text-ink-muted">
              {entry.at ? formatCommerceDateTime(entry.at) : "Belum"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Summary({
  order,
  token,
  payment,
  signedIn,
}: {
  order: OrderStatusView
  token: string
  payment: PaymentIntentView | null
  signedIn: boolean
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-7">
        <div className="border border-ink/20 bg-paper-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                Pesanan {order.code}
              </p>
              <h2 className="mt-1 font-heading text-[1.7rem] leading-tight">
                {order.workTitle}
              </h2>
              <p className="mt-1 text-[11px] text-ink-soft">
                Penjual {order.sellerName} · {order.buyerName}
              </p>
            </div>
            <StatusStamp
              label={ORDER_STATUS_LABELS[order.status] ?? order.status}
              tone={orderTone(order.status)}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/15 pt-3 text-[11px]">
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                Harga dasar
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {formatIDR(order.baseAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                Nominal dibayar
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {order.uniqueAmount ? formatIDR(order.uniqueAmount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                Kontak
              </dt>
              <dd className="mt-0.5">{order.buyerEmailMasked}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                Dibuat
              </dt>
              <dd className="mt-0.5">{formatCommerceDateTime(order.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-ink/15 pt-3 text-[10px] leading-relaxed text-ink-muted">
            Simpan tautan halaman ini. Tautan adalah kunci pesanan; jangan
            dibagikan. Data kontak penuh tidak ditampilkan di halaman publik.
          </p>
        </div>

        <PaymentBlock payment={payment} token={token} />
      </div>

      <div className="space-y-5 lg:col-span-5">
        <div className="border border-ink/20 bg-paper-2 p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
            Jejak pesanan
          </p>
          <div className="mt-3">
            <Timeline order={order} />
          </div>
        </div>

        <div className="border border-ink/20 bg-paper-2 p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
            Akun
          </p>
          {signedIn ? (
            <>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Pesanan ini tersimpan pada akunmu dan muncul di daftar pesanan
                ruang kerja.
              </p>
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link href="/ruang/pesanan">Buka pesanan saya</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Masuk dengan akun pembeli untuk melihat seluruh pesananmu di
                ruang kerja.
              </p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/masuk?next=${encodeURIComponent(`/pesanan/${token}`)}`}
                  >
                    Masuk ke akun
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderStatusLive({
  token,
  initialOrder,
  initialPayment,
  signedIn,
}: {
  token: string
  initialOrder: OrderStatusView
  initialPayment: PaymentIntentView | null
  signedIn: boolean
}) {
  const liveOrder = useQuery(api.commerce.getOrderByToken, { token })
  const livePayment = useQuery(api.payments.getIntentByToken, { token })
  const order = liveOrder ?? initialOrder
  const payment = livePayment ?? initialPayment

  return (
    <Summary
      order={order}
      token={token}
      payment={payment}
      signedIn={signedIn}
    />
  )
}

export function OrderStatusStatic({
  token,
  order,
  payment,
  signedIn,
}: {
  token: string
  order: OrderStatusView
  payment: PaymentIntentView | null
  signedIn: boolean
}) {
  return (
    <Summary
      order={order}
      token={token}
      payment={payment}
      signedIn={signedIn}
    />
  )
}
