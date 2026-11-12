"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatIDR } from "@/lib/format"

type CheckoutResponse = {
  ok: boolean
  manual?: boolean
  code?: string
  message?: string
  order?: { code: string; token: string }
}

export function CheckoutForm({
  slug,
  title,
  price,
  disabled = false,
}: {
  slug: string
  title: string
  price: number
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [consent, setConsent] = React.useState(false)
  const idempotencyKey = React.useRef<string>(crypto.randomUUID())

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || disabled || !consent) return
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload = {
      workSlug: slug,
      buyerName: String(form.get("buyerName") ?? "").trim(),
      buyerEmail: String(form.get("buyerEmail") ?? "").trim(),
      buyerWhatsapp: String(form.get("buyerWhatsapp") ?? "").trim() || undefined,
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
        Data pembeli
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        Checkout tanpa akun. Simpan tautan status pesanan setelah pembayaran
        dibuat; tautan itu adalah kunci pesanan ini.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <Label htmlFor="buyer-name">Nama penerima</Label>
          <Input
            id="buyer-name"
            name="buyerName"
            required
            minLength={2}
            autoComplete="name"
            className="mt-1.5"
            placeholder="Nama lengkap"
          />
        </div>
        <div>
          <Label htmlFor="buyer-email">Email</Label>
          <Input
            id="buyer-email"
            name="buyerEmail"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5"
            placeholder="nama@email.com"
            aria-describedby="buyer-email-note"
          />
          <p id="buyer-email-note" className="mt-1 text-[10px] text-ink-muted">
            Email terverifikasi yang sama dipakai untuk mengklaim pesanan ini.
          </p>
        </div>
        <div>
          <Label htmlFor="buyer-whatsapp">WhatsApp (opsional)</Label>
          <Input
            id="buyer-whatsapp"
            name="buyerWhatsapp"
            inputMode="tel"
            autoComplete="tel"
            className="mt-1.5"
            placeholder="+62 800 0000 0000"
          />
        </div>
        <div>
          <Label htmlFor="buyer-note">Catatan untuk pengrajin (opsional)</Label>
          <Textarea
            id="buyer-note"
            name="note"
            className="mt-1.5 min-h-20"
            placeholder="Ukuran, warna, atau waktu pengiriman."
          />
        </div>
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
