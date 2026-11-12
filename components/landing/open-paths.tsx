import type { LearningPath, SectionCopy } from "@/lib/content/types"

import { PathCard } from "./path-card"

export function OpenPaths({
  paths,
  copy,
}: {
  paths: LearningPath[]
  copy: SectionCopy["paths"]
}) {
  return (
    <section
      id="jalur"
      aria-labelledby="paths-title"
      className="border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">{copy.label}</span>
            <h2 id="paths-title" className="heading-section mt-5 max-w-[18ch]">
              {copy.title}
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] lg:col-span-5">
            {copy.description}
          </p>
        </div>

        {paths.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            {copy.emptyState}
          </p>
        ) : (
          <div className="mt-12 space-y-5 lg:mt-16">
            {paths.map((path) => (
              <PathCard key={path.slug} path={path} copy={copy} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
