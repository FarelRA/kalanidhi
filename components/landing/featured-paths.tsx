import { PathShowcase } from "@/components/landing/path-showcase"
import { SectionHeading } from "@/components/shared/section-heading"
import { paths } from "@/lib/content/landing"

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
          description="Materi terstruktur, paket bahan, koreksi pengajar, sertifikat platform, lalu jalan menuju karya atau jasa."
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

        <PathShowcase paths={paths} />
      </div>
    </section>
  )
}
