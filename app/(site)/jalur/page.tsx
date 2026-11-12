import type { Metadata } from "next"
import Link from "next/link"

import { PathCard } from "@/components/landing/path-card"
import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { pathMatchesField } from "@/lib/content/catalog"
import { buildPageMetadata } from "@/lib/content/metadata"
import { fieldHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { getPublicPaths, getSiteData } from "@/lib/convex/server"
import { cn } from "cn"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.paths, {
    title: data.sections.paths.title,
    description: data.sections.paths.description,
    alternates: { canonical: PUBLIC_ROUTES.paths },
  })
}

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [data, paths, params] = await Promise.all([
    getSiteData(),
    getPublicPaths(),
    searchParams,
  ])
  const copy = data.sections.paths
  const rawField = params.bidang
  const selectedField = Array.isArray(rawField) ? rawField[0] : rawField
  const fields = data.catalog.fields
  const activeField = selectedField
    ? fields.find((field) => field.name === selectedField)
    : undefined
  const visiblePaths = activeField
    ? paths.filter((path) => pathMatchesField(path, activeField.name))
    : paths

  return (
    <div className="bg-cream">
      <section aria-labelledby="paths-page-title" className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-ink/15 py-4">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {data.catalog.label}
          </span>
          <Link
            href={PUBLIC_ROUTES.paths}
            aria-current={!activeField ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center border px-2.5 text-[10.5px] font-semibold transition-colors",
              !activeField
                ? "border-ink bg-ink text-paper"
                : "border-ink/25 text-ink-soft hover:border-ink",
            )}
          >
            Semua
          </Link>
          {fields.map((field) => (
            <Link
              key={field.name}
              href={fieldHref(field.name)}
              aria-current={activeField?.name === field.name ? "page" : undefined}
              className={cn(
                "inline-flex min-h-8 items-center border px-2.5 text-[10.5px] font-semibold transition-colors",
                activeField?.name === field.name
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 text-ink-soft hover:border-ink",
              )}
            >
              {field.name}
            </Link>
          ))}
        </div>

        {activeField ? (
          <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
            Menampilkan jalur untuk bidang{" "}
            <strong className="font-semibold text-ink">{activeField.name}</strong>.
          </p>
        ) : null}

        {visiblePaths.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            {activeField
              ? `Belum ada jalur terbit untuk bidang ${activeField.name}. Bidang ini masih dipetakan atau menunggu pengajar.`
              : copy.emptyState}
          </p>
        ) : (
          <div className="mt-12 space-y-5">
            {visiblePaths.map((path) => (
              <PathCard key={path.slug} path={path} copy={copy} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
