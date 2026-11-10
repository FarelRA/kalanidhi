import { InstitutionPanel } from "@/components/landing/institution-panel"
import { SectionHeading } from "@/components/shared/section-heading"
import { institution } from "@/lib/content/landing"

export function InstitutionSection() {
  return (
    <section
      id="institusi"
      aria-labelledby="institusi-title"
      className="border-b border-paper/10 bg-[#4a3327] py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow={institution.eyebrow}
          title={institution.title}
          description={institution.description}
          titleId="institusi-title"
        />
        <div className="mt-10">
          <InstitutionPanel />
        </div>
      </div>
    </section>
  )
}
