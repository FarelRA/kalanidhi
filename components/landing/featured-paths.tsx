import { PathShowcase } from "@/components/landing/path-showcase"
import { SectionHeading } from "@/components/shared/section-heading"
import { culturalFields, paths } from "@/lib/content/landing"

export function FeaturedPaths() {
  return (
    <section
      id="jalur"
      aria-labelledby="jalur-title"
      className="border-b border-paper/10 bg-ink py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow="Jalur belajar"
          title="Pilih satu keterampilan, lalu jalani sampai karya."
          description="Dua jalur terbuka dan satu segera hadir. Ketiganya pilihan dari katalog yang tumbuh; setiap jalur bermuara pada karya atau jasa, dan lulusan yang siap bisa kembali mengajar."
          titleId="jalur-title"
          action={
            <a
              href="#faq"
              className="border-b border-soga/60 pb-0.5 text-[12px] text-paper transition-colors hover:border-paper hover:text-soga"
            >
              Butuh rekomendasi?
            </a>
          }
        />

        <div className="mt-10 border-y border-paper/12 py-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
            <p className="text-[11px] text-soga">{culturalFields.label}</p>
            <p className="max-w-lg text-[11px] leading-relaxed text-text-muted">
              {culturalFields.note}
            </p>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {culturalFields.items.map((field) => (
              <li
                key={field}
                className="flex items-center gap-2.5 text-[13px] text-paper-dim"
              >
                <span
                  aria-hidden="true"
                  className="size-1 shrink-0 bg-soga/70"
                />
                {field}
              </li>
            ))}
          </ul>
        </div>

        <PathShowcase paths={paths} />
      </div>
    </section>
  )
}
