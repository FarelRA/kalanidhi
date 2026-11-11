import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { InfoButton, LeadButton } from "@/components/overlays/overlay-buttons"
import type { Faq, SectionCopy } from "@/lib/content/types"

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
            <InfoButton infoKey="policy" variant="outline" className="border-ink/35">
              {copy.policyCta}
            </InfoButton>
            <LeadButton
              request={{ variant: "consultation", interest: "Pertanyaan umum" }}
              variant="ghost"
              className="text-ink/70 hover:bg-ink/5 hover:text-ink"
            >
              {copy.askCta}
            </LeadButton>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Accordion type="single" collapsible className="border-t-2 border-ink/25">
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
        </div>
      </div>
    </section>
  )
}
