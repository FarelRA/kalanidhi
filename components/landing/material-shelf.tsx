import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { CatalogField, SiteData } from "@/lib/content/types"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { cn } from "cn"

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

export function MaterialShelf({ catalog }: { catalog: SiteData["catalog"] }) {
  return (
    <section
      id="indeks"
      aria-labelledby="shelf-title"
      className="border-b border-ink/15 bg-panel py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">{catalog.label}</span>
            <h2 id="shelf-title" className="heading-section mt-5 max-w-[20ch]">
              {catalog.title}
            </h2>
          </div>
          <p className="body-copy max-w-[36rem] lg:col-span-5">{catalog.description}</p>
        </div>

        <div className="mt-12 space-y-12 lg:mt-16">
          {catalog.groups.map((group) => {
            const fields = catalog.fields.filter(
              (field) => field.status === group.status,
            )

            return (
              <div key={group.status}>
                <div className="mb-5 flex flex-col gap-2 border-b border-ink/20 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-heading text-[1.45rem] leading-none">
                      {group.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                      {fields.length} bidang
                    </span>
                  </div>
                  <p className="max-w-[36rem] text-[12px] leading-relaxed text-ink-soft">
                    {group.blurb}
                  </p>
                </div>

                <ul className="flex flex-wrap gap-3 sm:gap-4">
                  {fields.map((field) => {
                    const content = (
                      <>
                        <div>
                          <p className="font-heading text-[1.12rem] leading-tight">
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
                          <span className="ml-auto text-[9px] text-ink-muted">
                            {field.note}
                          </span>
                        </div>
                      </>
                    )

                    const base =
                      "flex min-h-[96px] w-full flex-col justify-between gap-3 border-2 p-3.5 sm:w-[218px]"

                    if (field.status === "Terbuka") {
                      return (
                        <li key={field.name} className="w-full sm:w-auto">
                          <Link
                            href={PUBLIC_ROUTES.paths}
                            className={cn(
                              base,
                              "border-ink bg-paper-2 text-ink shadow-[4px_4px_0_var(--copper-dark)] transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5",
                            )}
                          >
                            {content}
                          </Link>
                        </li>
                      )
                    }

                    return (
                      <li
                        key={field.name}
                        className={cn(
                          base,
                          "w-full sm:w-auto",
                          group.status === "Sedang dipetakan"
                            ? "border-ink/35 bg-cream/65 text-ink"
                            : "border-dashed border-ink/30 bg-transparent text-ink/75",
                        )}
                      >
                        {content}
                      </li>
                    )
                  })}
                </ul>

                <div className="bench-plank mt-5 h-3 w-full" aria-hidden="true" />
              </div>
            )
          })}
        </div>

        <div className="mt-12 border-t border-ink/20 pt-6 text-right">
          <Button asChild className="bg-ink text-paper hover:bg-ink-2">
            <Link href={PUBLIC_ROUTES.paths}>{catalog.cta}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
