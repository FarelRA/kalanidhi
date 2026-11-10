import { SectionHeading } from "@/components/shared/section-heading"
import { testimonials } from "@/lib/content/landing"

export function TestimonialsSection() {
  const [lead, ...rest] = testimonials

  return (
    <section
      aria-labelledby="testimoni-title"
      className="border-b border-paper/10 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow="Cerita peserta"
          title="Yang berubah setelah karya pertama."
          description="Umpan balik dari peserta dan mitra uji coba terbatas 2026, ditampilkan dengan izin."
          titleId="testimoni-title"
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <figure className="lg:col-span-7">
            <blockquote className="font-heading text-[1.9rem] leading-[1.18] tracking-[-0.01em] text-paper sm:text-[2.6rem]">
              “{lead.quote}”
            </blockquote>
            <figcaption className="mt-6 border-t border-soga/40 pt-4">
              <p className="text-[13px] text-paper">{lead.name}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {lead.role}, {lead.city}
              </p>
            </figcaption>
          </figure>

          <div className="lg:col-span-5 lg:pl-8">
            {rest.map((testimonial) => (
              <figure
                key={testimonial.name}
                className="border-t border-paper/15 py-6 first:border-t-0 first:pt-0"
              >
                <blockquote className="text-[14px] leading-[1.7] text-paper-dim">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-3 text-[11px] text-text-muted">
                  <span className="text-paper">{testimonial.name}</span>,{" "}
                  {testimonial.role}
                </figcaption>
              </figure>
            ))}
            <p className="border-t border-paper/15 pt-4 text-[10px] leading-relaxed text-text-muted">
              Umpan balik dari peserta dan mitra uji coba terbatas 2026. Kohort
              pertama diikuti 24 peserta. Kutipan ditampilkan dengan izin. Hasil
              setiap orang berbeda.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
