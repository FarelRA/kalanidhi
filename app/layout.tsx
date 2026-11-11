import type { Metadata, Viewport } from "next"
import { Fraunces, Karla } from "next/font/google"
import Script from "next/script"

import { MobileCtaDock } from "@/components/landing/mobile-cta-dock"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { OverlayProvider } from "@/components/overlays/overlay-provider"
import { ConvexClientProvider } from "@/components/providers/convex-client-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSiteData } from "@/lib/convex/server"
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

export async function generateMetadata(): Promise<Metadata> {
  const { metadata } = await getSiteData()

  return {
    metadataBase: new URL(metadata.siteUrl),
    title: {
      default: metadata.title,
      template: `%s | ${metadata.siteName}`,
    },
    description: metadata.description,
    applicationName: metadata.siteName,
    keywords: metadata.keywords,
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: metadata.siteName,
      title: metadata.ogTitle,
      description: metadata.ogDescription,
      images: [metadata.image],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.twitterTitle,
      description: metadata.twitterDescription,
      images: [metadata.image.url],
    },
    robots: {
      index: true,
      follow: true,
    },
    category: metadata.category,
  }
}

export const viewport: Viewport = {
  themeColor: "#f4ead8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const data = await getSiteData()
  const searchGroups = buildSearchGroups(data)
  const prices = data.paths
    .map((path) => path.price)
    .filter((price): price is number => typeof price === "number")
  const startingPrice = prices.length ? Math.min(...prices) : 0

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
        <ConvexClientProvider url={process.env.NEXT_PUBLIC_CONVEX_URL}>
          <TooltipProvider delayDuration={150}>
            <OverlayProvider
              overlays={data.overlays}
              leadDialogs={data.leadDialogs}
            >
              <SiteHeader
                navigation={data.navigation}
                searchGroups={searchGroups}
                copy={data.header}
                searchCopy={data.search}
              />
              <main id="konten" tabIndex={-1} className="flex-1">
                {children}
              </main>
              <SiteFooter footer={data.footer} ethics={data.ethics} />
              <MobileCtaDock
                startingPrice={startingPrice}
                copy={data.mobileCta}
              />
              <Toaster />
            </OverlayProvider>
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
