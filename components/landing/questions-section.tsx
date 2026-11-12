import Link from "next/link"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { Faq, SectionCopy } from "@/lib/content/types"
import { interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"

export function QuestionsSection({
  faqs,
  copy,
}: {
  faqs: Faq[]
  copy: SectionCopy["faq"]
}) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="border-b border-ink/15 bg-cream-2 py-16 sm:py-20 lg:py-24"
    >
      <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <span className="stamp border-ink/35 text-ink">{copy.label}</span>
          <h2 id="faq-title" className="heading-section mt-5 max-w-[13ch]">
            {copy.title}
          </h2>
          <p className="body-copy mt-5 max-w-[34rem]">
            {copy.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={PUBLIC_ROUTES.ethics}
              className="inline-flex min-h-11 items-center border border-ink/35 px-5 text-[12px] font-medium text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
            >
              {copy.policyCta}
            </Link>
            <Link
              href={interestHref({
                intent: "consultation",
                interest: "Pertanyaan umum",
              })}
              className="inline-flex min-h-11 items-center px-3 text-[12px] font-medium text-ink/70 transition-colors hover:text-ink"
            >
              {copy.askCta}
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7">
          {faqs.length === 0 ? (
            <p className="border border-ink/20 bg-paper-2 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
              Belum ada pertanyaan umum yang terbit di Convex.
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              className="border-t-2 border-ink/25"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${index}`}
                  className="border-b border-ink/20"
                >
                  <AccordionTrigger className="py-5 text-[1.1rem] leading-snug sm:text-[1.2rem]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-[62ch] pb-5 pr-6 text-[13px] leading-relaxed text-ink/70">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </section>
  )
}
