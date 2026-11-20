"use client"

import Link from "next/link"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="shell flex min-h-svh flex-col justify-center py-16">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
        Ada gangguan
      </p>
      <h1 className="heading-section mt-3 max-w-[18ch]">
        Halaman ini belum bisa dibuka.
      </h1>
      <p className="body-copy mt-4 max-w-[38rem]">
        Coba muat ulang. Kalau masih gagal, kembali ke beranda atau buka daftar
        kelas.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-paper"
        >
          Muat ulang
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center border border-ink/35 px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink"
        >
          Beranda
        </Link>
        <Link
          href="/kelas"
          className="inline-flex min-h-11 items-center border border-ink/35 px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink"
        >
          Daftar kelas
        </Link>
      </div>
    </main>
  )
}
