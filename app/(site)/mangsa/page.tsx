import type { Metadata } from "next"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { SeasonNote } from "@/components/landing/season-note"
import { buildPageMetadata } from "@/lib/content/metadata"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.mangsa, {
    title: data.mangsa.title,
    description: data.mangsa.description,
    alternates: { canonical: PUBLIC_ROUTES.mangsa },
  })
}

export default async function MangsaPage() {
  const data = await getSiteData()

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow={data.mangsa.label}
          title={data.mangsa.title}
          description={data.mangsa.description}
        />
      </section>

      <SeasonNote mangsa={data.mangsa} />
    </div>
  )
}
