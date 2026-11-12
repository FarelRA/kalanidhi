import type { Metadata } from "next"

import { InfoPageContent } from "@/components/landing/info-page"
import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { buildPageMetadata } from "@/lib/content/metadata"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.privacy, {
    title: data.overlays.privacy.title,
    description: data.overlays.privacy.description,
    alternates: { canonical: PUBLIC_ROUTES.privacy },
  })
}

export default async function PrivacyPage() {
  const data = await getSiteData()
  const content = data.overlays.privacy

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow="Privasi"
          title={content.title}
          description={content.description}
        />
        <InfoPageContent content={content} />
      </section>
    </div>
  )
}
