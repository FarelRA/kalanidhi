import type { Metadata } from "next"

import { SiteChrome } from "@/app/(site)/site-chrome"
import { NotFoundContent } from "@/app/(site)/not-found-content"

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  description:
    "Alamat ini tidak tersedia. Buka kelas belajar, karya, pengajar, atau pertanyaan umum dari halaman ini.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  )
}
