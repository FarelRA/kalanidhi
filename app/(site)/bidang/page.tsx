import type { Metadata } from "next"
import Link from "next/link"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { buildPageMetadata } from "@/lib/content/metadata"
import { fieldHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import type { CatalogField } from "@/lib/content/types"
import { getSiteData } from "@/lib/convex/server"
import { cn } from "cn"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.fields, {
    title: data.catalog.label,
    description: data.catalog.description,
    alternates: { canonical: PUBLIC_ROUTES.fields },
  })
}

function StatusMark({ status }: { status: CatalogField["status"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0",
        status === "Terbuka" && "bg-copper-dark",
        status === "Sedang dipetakan" &&
          "border border-ink/70 bg-[linear-gradient(90deg,var(--ink)_50%,transparent_50%)]",
        status === "Direncanakan" && "border border-ink/45 bg-transparent",
      )}
    />
  )
}

export default async function FieldsPage() {
  const data = await getSiteData()
  const catalog = data.catalog
  const total = catalog.fields.length

  return (
    <div className="bg-cream">
      <section aria-labelledby="fields-page-title" className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow={catalog.label}
          title={catalog.title}
          description={catalog.description}
        />

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-ink/15 py-4">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {total} bidang
          </span>
          {catalog.groups.map((group) => (
            <span
              key={group.status}
              className="inline-flex items-center gap-2 text-[10.5px] text-ink-soft"
            >
              <StatusMark status={group.status} />
              {group.status}
            </span>
          ))}
        </div>

        {total === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            Belum ada bidang yang tercatat di Convex. Bidang akan muncul di sini
            setelah pengajar dan kurikulumnya dipetakan.
          </p>
        ) : (
          <div className="mt-12 space-y-12">
            {catalog.groups.map((group) => {
              const fields = catalog.fields.filter(
                (field) => field.status === group.status,
              )
              if (fields.length === 0) return null

              return (
                <section key={group.status} aria-labelledby={`group-${group.status}`}>
                  <div className="mb-5 flex flex-col gap-2 border-b border-ink/20 pb-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-baseline gap-3">
                      <h2
                        id={`group-${group.status}`}
                        className="font-heading text-[1.45rem] leading-none"
                      >
                        {group.title}
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        {fields.length} bidang
                      </span>
                    </div>
                    <p className="max-w-[36rem] text-[12px] leading-relaxed text-ink-soft">
                      {group.blurb}
                    </p>
                  </div>

                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => (
                      <li key={field.name}>
                        <Link
                          href={fieldHref(field.name)}
                          className={cn(
                            "flex min-h-[112px] flex-col justify-between gap-3 border-2 p-4 transition-colors",
                            field.status === "Terbuka"
                              ? "border-ink bg-paper-2 text-ink shadow-[4px_4px_0_var(--copper-dark)] hover:-translate-y-0.5"
                              : field.status === "Sedang dipetakan"
                                ? "border-ink/35 bg-cream/65 text-ink hover:border-ink"
                                : "border-dashed border-ink/30 bg-transparent text-ink/75 hover:border-ink/60",
                          )}
                        >
                          <div>
                            <p className="font-heading text-[1.2rem] leading-tight">
                              {field.name}
                            </p>
                            <p className="mt-1 text-[10.5px] leading-snug text-ink-muted">
                              {field.region}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusMark status={field.status} />
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                              {field.status}
                            </span>
                            <span className="ml-auto text-right text-[9px] text-ink-muted">
                              {field.note}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/20 pt-6">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Bidang yang sudah terbuka punya jalur dengan pengajar dan kurikulum.
          </p>
          <Link
            href={PUBLIC_ROUTES.paths}
            className="ml-auto inline-flex min-h-11 items-center border border-ink bg-ink px-5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
          >
            {catalog.cta}
          </Link>
        </div>
      </section>
    </div>
  )
}
