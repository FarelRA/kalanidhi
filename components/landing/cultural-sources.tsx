import { summarizeCulturalSource } from "@/lib/content/sources"
import type { PublicCulturalSource } from "@/lib/content/types"

const ACCESS_LABELS = {
  public: "Publik",
  community: "Terbatas komunitas",
  restricted: "Terbatas",
} as const

function accessLabel(level: PublicCulturalSource["accessLevel"]): string {
  return ACCESS_LABELS[level]
}

/** Compact source list for one class or one work, never the whole archive. */
export function CulturalSources({
  sources,
  title = "Sumber budaya",
}: {
  sources: PublicCulturalSource[]
  title?: string
}) {
  if (sources.length === 0) return null

  return (
    <section
      aria-labelledby="sumber-budaya-title"
      className="border border-ink/20 bg-paper-2 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="sumber-budaya-title"
          className="font-heading text-[1.3rem] leading-tight"
        >
          {title}
        </h2>
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          {sources.length} sumber
        </span>
      </div>
      <ul className="mt-3 divide-y divide-ink/15 border-t border-ink/15">
        {sources.map((source) => {
          const row = summarizeCulturalSource(source)
          return (
            <li
              key={`${row.community}-${row.sourceName}`}
              className="py-3 first:pt-3 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-heading text-[1.05rem] leading-tight">
                  {row.community}
                </p>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  {row.statusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                {row.sourceName}
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink/70">
                {row.attribution}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-snug text-ink-muted">
                {row.dateLabel ? <span>Dicatat {row.dateLabel}</span> : null}
                <span>{accessLabel(source.accessLevel)}</span>
                {source.notes ? <span>{source.notes}</span> : null}
              </p>
              {row.reference ? (
                <p className="mt-1 break-words text-[10.5px] leading-snug text-ink/70">
                  {row.referenceKind === "public" ? (
                    <a
                      href={row.reference}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2 hover:text-copper-dark"
                    >
                      {row.reference}
                    </a>
                  ) : (
                    row.reference
                  )}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
