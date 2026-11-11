import { testimonials } from "@/lib/content/landing"
import { cn } from "cn"

const rotations = ["md:-rotate-[0.6deg]", "md:rotate-[0.5deg]", "md:-rotate-[0.4deg]"] as const

export function ParticipantNotes() {
  return (
    <section
      aria-labelledby="notes-title"
      className="border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">Catatan peserta</span>
            <h2 id="notes-title" className="heading-section mt-5 max-w-[16ch]">
              Catatan dari peserta.
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] lg:col-span-5">
            Tiga catatan dari peserta dan mitra uji coba 2026, dikutip dengan
            izin. Isinya pengalaman yang bisa diperiksa.
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={cn(
                "clip-top relative border-2 border-ink bg-paper-2 p-5 pt-7 shadow-[5px_5px_0_var(--panel)]",
                rotations[index],
              )}
            >
              <blockquote className="font-heading text-[1.16rem] italic leading-[1.42] text-ink/85">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <footer className="mt-5 flex items-center gap-3 border-t border-ink/15 pt-3">
                <span className="flex size-9 shrink-0 items-center justify-center bg-panel font-heading text-[13px] font-semibold text-ink">
                  {testimonial.initials}
                </span>
                <div>
                  <p className="text-[12px] font-semibold leading-tight">
                    {testimonial.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
                    {testimonial.role}
                  </p>
                  <p className="text-[10px] leading-snug text-ink-muted">
                    {testimonial.city}
                  </p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
