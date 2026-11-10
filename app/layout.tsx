import type { Metadata, Viewport } from "next"
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"

import { MobileCtaDock } from "@/components/landing/mobile-cta-dock"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { OverlayProvider } from "@/components/overlays/overlay-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildSearchGroups } from "@/lib/search"

import "./globals.css"

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  axes: ["SOFT", "WONK", "opsz"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://kalanidhi.digital"),
  title: {
    default: "KalaNidhi Digital: Belajar dari ahli, berkarya, berpenghasilan",
    template: "%s | KalaNidhi Digital",
  },
  description:
    "Platform belajar seni dan kriya tradisi Nusantara. Dibimbing pengajar, dinilai personal, tersertifikasi platform, lalu tersambung ke pasar karya dan jasa.",
  applicationName: "KalaNidhi Digital",
  keywords: [
    "batik tulis",
    "pembawa acara adat",
    "kriya tradisi",
    "kursus budaya",
    "sertifikat platform",
    "KalaNidhi",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "KalaNidhi Digital",
    title: "KalaNidhi Digital: Belajar langsung dari ahli",
    description:
      "Belajar batik, pembawa acara adat, dan kriya tradisi. Dinilai pengajar, tersertifikasi platform, lalu bertemu pembeli yang menghargai karya tangan.",
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
    title: "KalaNidhi Digital: Belajar langsung dari ahli",
    description:
      "Jalur belajar seni tradisi Nusantara dengan koreksi pengajar dan sertifikat platform.",
    images: ["/images/hero-canting.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "education",
}

export const viewport: Viewport = {
  themeColor: "#34302B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchGroups = buildSearchGroups()

  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${fraunces.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script id="js-flag" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("kalanidhi:data-saver")==="on"){document.documentElement.dataset.dataSaver="on"}}catch(e){}`}
        </Script>
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[3px] focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Lewati ke konten utama
        </a>
        <TooltipProvider delayDuration={150}>
          <OverlayProvider>
            <SiteHeader searchGroups={searchGroups} />
            <main id="konten" tabIndex={-1} className="flex-1 pb-24 md:pb-0">
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
