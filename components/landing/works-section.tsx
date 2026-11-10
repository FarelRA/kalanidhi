import { WorkGallery } from "@/components/landing/work-gallery"
import { LeadButton } from "@/components/overlays/overlay-buttons"
import { SectionHeading } from "@/components/shared/section-heading"
import { works } from "@/lib/content/landing"

export function WorksSection() {
  return (
    <section
      id="karya"
      aria-labelledby="karya-title"
      className="border-b border-paper/10 bg-ink-2/40 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow="Karya & jasa"
          title="Karya yang bisa kamu telusuri sampai pembuatnya."
          description="Setiap karya punya Kartu Karya: siapa pembuatnya, teknik yang dipakai, dan bagaimana prosesnya berjalan."
          titleId="karya-title"
          action={
            <LeadButton
              request={{ variant: "student" }}
              variant="ghost"
              size="sm"
              className="border-0 border-b border-soga/60 px-0 text-soga hover:bg-transparent hover:text-paper"
            >
              Mulai jual karya
            </LeadButton>
          }
        />
        <WorkGallery works={works} />
      </div>
    </section>
  )
}
