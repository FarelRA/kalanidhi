import type { Metadata, Viewport } from "next"
import { Fraunces, Karla } from "next/font/google"
import Script from "next/script"

import { ConvexClientProvider } from "@/components/providers/convex-client-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSiteData } from "@/lib/convex/server"

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${karla.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Script id="js-flag" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("kalanidhi:data-saver")==="on"){document.documentElement.dataset.dataSaver="on"}}catch(e){}`}
        </Script>
        <ConvexClientProvider
          url={process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL}
          authEnabled={Boolean(
            process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
          )}
        >
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
