"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirects a workspace visitor from the client instead of throwing
 * `redirect()` after a streamed shell. A direct request then gets a readable
 * notice, not the global error boundary, and still moves on after hydration.
 */
export function RedirectNotice({ to }: { to: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(to)
  }, [router, to])

  return (
    <main className="shell flex min-h-svh flex-col justify-center py-16">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
        Ruang kerja
      </p>
      <h1 className="heading-section mt-3 max-w-[24ch]">
        Mengalihkan ke halaman masuk.
      </h1>
      <p className="body-copy mt-4 max-w-[38rem]">
        Sesi belum aktif. Kalau halaman tidak berpindah sendiri, buka tautan di
        bawah.
      </p>
      <Link
        href={to}
        className="mt-7 inline-flex min-h-11 w-fit items-center border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-paper"
      >
        Buka halaman masuk
      </Link>
    </main>
  )
}
