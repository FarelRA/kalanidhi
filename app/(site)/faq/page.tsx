import type { Metadata } from "next"
import Link from "next/link"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { buildPageMetadata } from "@/lib/content/metadata"
import { interestHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import { getPublicFaqs, getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.faq, {
    title: data.sections.faq.title,
    description: data.sections.faq.description,
    alternates: { canonical: PUBLIC_ROUTES.faq },
  })
}

export default async function FaqPage() {
  const [data, faqs] = await Promise.all([getSiteData(), getPublicFaqs()])
  const copy = data.sections.faq

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
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

          <aside className="lg:col-span-5">
            <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)]">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                Masih ada pertanyaan?
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                Kirim lewat formulir. Kami menjawab lewat email atau WhatsApp.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={interestHref({
                    intent: "consultation",
                    interest: "Pertanyaan umum",
                  })}
                  className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                >
                  {copy.askCta}
                </Link>
                <Link
                  href={PUBLIC_ROUTES.ethics}
                  className="inline-flex min-h-11 items-center justify-center border border-ink/35 px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
                >
                  {copy.policyCta}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
