import Link from "next/link"

import { BrandLockup } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="shell flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
      <BrandLockup markSize={44} />
      <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.14em] text-thread">
        halaman tidak ditemukan
      </p>
      <h1 className="heading-section mt-4 max-w-xl">
        Bangku ini belum tersambung.
      </h1>
      <p className="body-copy mt-4 max-w-md">
        Alamat yang kamu buka mungkin sudah berpindah. Kembali ke beranda untuk
        melihat jalur belajar dan karya yang tersedia.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Kembali ke beranda</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/#karya">Jelajahi karya</Link>
        </Button>
      </div>
    </div>
  )
}
