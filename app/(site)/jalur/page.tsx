import type { Metadata } from "next"

import { PathCard } from "@/components/landing/path-card"
import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { buildPageMetadata } from "@/lib/content/metadata"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { getPublicPaths, getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.paths, {
    title: data.sections.paths.title,
    description: data.sections.paths.description,
    alternates: { canonical: PUBLIC_ROUTES.paths },
  })
}

export default async function PathsPage() {
  const [data, paths] = await Promise.all([getSiteData(), getPublicPaths()])
  const copy = data.sections.paths

  return (
    <div className="bg-cream">
      <section aria-labelledby="paths-page-title" className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow={copy.label}
          title={copy.title}
          description={copy.description}
        />

        {paths.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            Belum ada jalur yang terbit di Convex. Jalur akan muncul di sini
            setelah kurikulum, pengajar, dan angkatan pertama tersedia.
          </p>
        ) : (
          <div className="mt-12 space-y-5">
            {paths.map((path) => (
              <PathCard key={path.slug} path={path} copy={copy} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
