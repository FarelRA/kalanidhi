import Link from "next/link"

import { BrandLockup } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import { PUBLIC_ROUTES } from "@/lib/content/routes"

const recoveryLinks = [
  { href: PUBLIC_ROUTES.paths, label: "Kelas belajar" },
  { href: PUBLIC_ROUTES.works, label: "Karya dan jasa" },
  { href: PUBLIC_ROUTES.teachers, label: "Pengajar" },
  { href: PUBLIC_ROUTES.faq, label: "Pertanyaan umum" },
] as const

export function NotFoundContent() {
  return (
    <div className="shell flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
      <BrandLockup markSize={44} />
      <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.14em] text-thread">
        halaman tidak ditemukan
      </p>
      <h1 className="heading-section mt-4 max-w-xl">
        Halaman ini belum tersambung.
      </h1>
      <p className="body-copy mt-4 max-w-md">
        Alamat yang kamu buka mungkin sudah berpindah. Kembali ke beranda untuk
        melihat kelas belajar dan karya yang tersedia.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Button asChild size="lg">
          <Link href={PUBLIC_ROUTES.home}>Kembali ke beranda</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={PUBLIC_ROUTES.consult}>Tanya dulu</Link>
        </Button>
      </div>
      <nav
        aria-label="Halaman yang tersedia"
        className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-ink-muted"
      >
        {recoveryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="underline underline-offset-2 hover:text-copper-dark"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
