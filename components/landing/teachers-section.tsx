import { TeacherCarousel } from "@/components/landing/teacher-carousel"
import { SectionHeading } from "@/components/shared/section-heading"
import { teachers } from "@/lib/content/landing"

export function TeachersSection() {
  return (
    <section
      id="pengajar"
      aria-labelledby="pengajar-title"
      className="border-b border-paper/10 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow="Pengajar"
          title="Belajar dari orang yang masih mengerjakan tradisinya."
          description="Tiga dari 14 pengajar dan praktisi yang terlibat dalam uji coba terbatas 2026. Mereka meninjau proses, memberi koreksi, dan menjaga konteks budaya di balik setiap teknik."
          titleId="pengajar-title"
        />
        <TeacherCarousel teachers={teachers} />
      </div>
    </section>
  )
}
