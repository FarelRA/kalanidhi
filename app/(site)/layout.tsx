import { MobileCtaDock } from "@/components/landing/mobile-cta-dock"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { getSiteData } from "@/lib/convex/server"
import { buildSearchGroups } from "@/lib/search"

export default async function SiteLayout({
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
      <SiteFooter footer={data.footer} ethics={data.ethics} />
      <MobileCtaDock startingPrice={startingPrice} copy={data.mobileCta} />
    </div>
  )
}
