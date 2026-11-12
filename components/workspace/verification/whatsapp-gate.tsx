"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { MessageCircle, RefreshCw, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Viewer } from "@/lib/access/viewer"

export function WhatsappGate({ viewer }: { viewer: Viewer }) {
  const router = useRouter()
  const state = useQuery(api.users.verificationState)
  const resend = useMutation(api.users.resendVerification)
  const [waUrl, setWaUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (state?.whatsappVerified) {
      router.refresh()
    }
  }, [state?.whatsappVerified, router])

  async function onResend() {
    setError(null)
    setPending(true)
    try {
      const result = await resend({})
      setWaUrl(result.waUrl)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Tautan belum dapat dibuat. Coba lagi.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-xl border border-ink/25 bg-paper-2 p-6 sm:p-9">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
          Verifikasi identitas
        </p>
        <h1 className="heading-section mt-2 flex items-center gap-3 text-[clamp(1.9rem,4vw,2.8rem)]">
          <ShieldCheck className="size-8 text-copper-dark" aria-hidden="true" />
          Sambungkan WhatsApp.
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          Nomor WhatsApp adalah identitas utama akun KalaNidhi. Ruang kerja
          terbuka setelah nomor{" "}
          <span className="font-semibold text-ink">
            {viewer.phone || state?.phone || "—"}
          </span>{" "}
          mengirim pesan verifikasi.
        </p>

        <ol className="mt-5 space-y-2 border border-ink/15 bg-cream px-4 py-4 text-[12px] leading-relaxed text-ink-soft">
          <li>1. Tekan tombol di bawah untuk membuka WhatsApp.</li>
          <li>2. Kirim pesan itu dari nomor WhatsApp ini.</li>
          <li>
            3. Kembali ke halaman ini. Verifikasi akan terdeteksi otomatis.
          </li>
        </ol>

        {state?.pendingExpiresAt ? (
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink-muted">
            Tautan aktif sampai{" "}
            {new Date(state.pendingExpiresAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            })}
            .
          </p>
        ) : null}

        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
            Buka WhatsApp
          </a>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-5">
          <Button
            type="button"
            onClick={onResend}
            disabled={pending}
            variant="outline"
          >
            <RefreshCw
              className={`size-3.5 ${pending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {pending ? "Membuat tautan…" : "Kirim ulang tautan"}
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
          >
            Kembali ke situs publik
          </Link>
        </div>
      </div>
    </div>
  )
}
