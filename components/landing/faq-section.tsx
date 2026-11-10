import { faqs } from "@/lib/content/landing"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  InfoButton,
  LeadButton,
} from "@/components/overlays/overlay-buttons"
import { SectionHeading } from "@/components/shared/section-heading"

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="border-b border-paper/10 bg-ink-2/40 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <SectionHeading
            eyebrow="Pertanyaan umum"
            title="Pertanyaan yang paling sering masuk."
            description="Belum ketemu jawabannya? Tanyakan langsung lewat formulir konsultasi."
            titleId="faq-title"
          />
          <div className="mt-6">
            <InfoButton
              infoKey="policy"
              variant="ghost"
              size="sm"
              className="border-0 border-b border-paper/25 px-0 text-paper-dim hover:bg-transparent hover:text-paper"
            >
              Etika & hak budaya
            </InfoButton>
          </div>
          <LeadButton
            request={{
              variant: "consultation",
              interest: "Pertanyaan sebelum mulai",
            }}
            variant="link"
            size="sm"
            className="mt-6 h-auto px-0 text-soga"
          >
            Tanya lewat formulir
          </LeadButton>
        </div>

        <div className="lg:col-span-8">
          <Accordion type="single" collapsible className="border-t border-paper/15">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="border-b border-paper/15"
              >
                <AccordionTrigger>
                  <span className="flex items-start gap-4">
                    <span className="text-[15px] leading-snug sm:text-[17px]">
                      {faq.question}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-9">
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
