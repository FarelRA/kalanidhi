import Link from "next/link"

import { MobileCtaDock } from "@/components/landing/mobile-cta-dock"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { getSiteData } from "@/lib/convex/server"
import { buildSearchGroups } from "@/lib/search"

/**
 * Shared public-site chrome. The site layout and the root 404 both use this so
 * a missing page keeps the same header, footer, and mobile dock without
 * duplicating the root document layout.
 */
export async function SiteChrome({
  children,
}: {
  children: React.ReactNode
}) {
  const data = await getSiteData().catch(() => null)

  if (!data) {
    // Do not render children that need Convex content while the database is
    // empty. A short maintenance page keeps every direct URL readable during a
    // reseed instead of sending it to the error boundary.
    return (
      <div className="flex min-h-svh flex-col">
        <main id="konten" tabIndex={-1} className="flex flex-1 items-center">
          <div className="shell py-16">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
              KalaNidhi Digital
            </p>
            <h1 className="heading-section mt-3 max-w-[20ch]">
              Sedang diperbarui.
            </h1>
            <p className="body-copy mt-4 max-w-[38rem]">
              Konten sedang dimuat ulang. Coba buka halaman ini lagi beberapa
              saat lagi.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex min-h-11 items-center border border-ink bg-ink px-5 text-[11px] font-bold uppercase tracking-[0.06em] text-paper"
            >
              Kembali ke beranda
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const searchGroups = buildSearchGroups(data)
  const prices = data.paths
    .map((path) => path.price)
    .filter((price): price is number => typeof price === "number")
  const startingPrice = prices.length ? Math.min(...prices) : null

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper-2 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Lewati ke konten utama
      </a>
      <SiteHeader
        navigation={data.navigation}
        searchGroups={searchGroups}
        copy={data.header}
        searchCopy={data.search}
      />
      <main id="konten" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter footer={data.footer} />
      <MobileCtaDock startingPrice={startingPrice} copy={data.mobileCta} />
    </div>
  )
}
