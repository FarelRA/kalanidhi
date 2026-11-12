"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { splitAmount } from "@/lib/commerce/money"
import { formatIDR } from "@/lib/format"

type CheckoutResponse = {
  ok: boolean
  manual?: boolean
  code?: string
  message?: string
  order?: { code: string; token: string }
}

export type CheckoutIdentity = {
  name: string
  email: string
  whatsapp?: string
}

export function CheckoutForm({
  kind,
  slug,
  title,
  price,
  identity,
  disabled = false,
}: {
  kind: "work" | "path"
  slug: string
  title: string
  price: number
  identity: CheckoutIdentity
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [consent, setConsent] = React.useState(false)
  const idempotencyKey = React.useRef<string>(crypto.randomUUID())
  const split = splitAmount(price)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || disabled || !consent) return
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload = {
      kind,
      slug,
      note: String(form.get("note") ?? "").trim() || undefined,
      idempotencyKey: idempotencyKey.current,
      consentTransactional: true,
    }

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as CheckoutResponse
      if (!response.ok || !data.ok || !data.order?.token) {
        setError(data.message ?? "Checkout belum dapat diproses.")
        return
      }
      router.push(`/pesanan/${data.order.token}`)
    } catch {
      setError("Jaringan bermasalah. Coba lagi tanpa mengubah data.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="border border-ink/20 bg-paper-2 p-5 sm:p-7">
      <h2 className="font-heading text-[1.4rem] leading-tight text-ink">
        Identitas pembeli
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        Pesanan tercatat pada akun yang sedang masuk. Identitas di bawah tidak
        dapat diubah dari halaman ini.
      </p>

      <dl className="mt-5 grid gap-3 border border-ink/15 bg-cream/60 p-4 text-[11.5px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Nama
          </dt>
          <dd className="font-semibold text-ink">{identity.name}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Email
          </dt>
          <dd className="font-semibold text-ink">{identity.email}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            WhatsApp
          </dt>
          <dd className="font-semibold text-ink">
            {identity.whatsapp?.trim() || "Belum diisi"}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <Label htmlFor="buyer-note">Catatan untuk pengrajin (opsional)</Label>
        <Textarea
          id="buyer-note"
          name="note"
          className="mt-1.5 min-h-20"
          placeholder="Ukuran, warna, atau waktu pengiriman."
        />
      </div>

      <div className="mt-5 border-t border-ink/15 pt-4">
        <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--copper)]"
            required
          />
          <span>
            Saya setuju dihubungi melalui email atau WhatsApp hanya untuk
            keperluan pesanan ini: pembayaran, pengiriman, dan penyelesaian.
          </span>
        </label>
      </div>

      <div className="mt-5 border border-ink/15 bg-panel/30 p-3">
        <div className="flex h-4 border border-ink/25" aria-hidden="true">
          <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
          <span className="h-full bg-ink" style={{ width: "15%" }} />
          <span className="h-full bg-moss" style={{ width: "15%" }} />
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
          <div>
            <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
              Pengrajin 70%
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatIDR(split.teacherShare)}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
              Platform 15%
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatIDR(split.platformShare)}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.06em] text-ink-muted">
              Komunitas 15%
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatIDR(split.communityShare)}
            </dd>
          </div>
        </dl>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-[#8a2e1f]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Total sebelum nominal unik
          </p>
          <p className="mt-1 font-heading text-xl leading-none">{formatIDR(price)}</p>
        </div>
        <Button type="submit" size="lg" disabled={pending || disabled || !consent}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
          Lanjut ke pembayaran
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-ink-muted">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
        Nominal akhir dapat berbeda 1–999 rupiah sebagai penanda rekonsiliasi.
        Nominal itu bukan pendapatan platform dan akan ditampilkan sebelum
        membayar. Baca{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-copper-dark">
          ketentuan sumber budaya
        </Link>
        .
      </p>
      <p className="sr-only">{title}</p>
    </form>
  )
}
