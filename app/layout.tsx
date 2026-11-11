import type { Metadata, Viewport } from "next"
import { Fraunces, Karla } from "next/font/google"
import Script from "next/script"

import { MobileCtaDock } from "@/components/landing/mobile-cta-dock"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { OverlayProvider } from "@/components/overlays/overlay-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildSearchGroups } from "@/lib/search"

import "./globals.css"

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
})

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL("https://kalanidhi.digital"),
  title: {
    default: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    template: "%s | KalaNidhi Digital",
  },
  description:
    "Platform belajar praktik budaya Nusantara. Tugas dinilai pengajar, sertifikat platform bisa diverifikasi, karya punya Kartu Karya. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
  applicationName: "KalaNidhi Digital",
  keywords: [
    "batik tulis",
    "pranatacara",
    "tenun",
    "karawitan",
    "tari tradisi",
    "keramik",
    "jamu",
    "wayang",
    "kriya tradisi",
    "kursus budaya",
    "sertifikat platform",
    "KalaNidhi",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "KalaNidhi Digital",
    title: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    description:
      "Sepuluh bidang budaya dipetakan, dua jalur terbuka. Belajar langsung dari pengajar, dinilai manusia, lalu berkarya dengan Kartu Karya.",
    images: [
      {
        url: "/images/hero-canting.jpg",
        width: 1408,
        height: 768,
        alt: "Proses membatik dengan canting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
    description:
      "Jalur belajar praktik budaya Nusantara dengan penilaian pengajar dan sertifikat platform.",
    images: ["/images/hero-canting.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "education",
}

export const viewport: Viewport = {
  themeColor: "#f4ead8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchGroups = buildSearchGroups()

  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${karla.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script id="js-flag" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("kalanidhi:data-saver")==="on"){document.documentElement.dataset.dataSaver="on"}}catch(e){}`}
        </Script>
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper-2 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Lewati ke konten utama
        </a>
        <TooltipProvider delayDuration={150}>
          <OverlayProvider>
            <SiteHeader searchGroups={searchGroups} />
            <main id="konten" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <SiteFooter />
            <MobileCtaDock />
            <Toaster />
          </OverlayProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
