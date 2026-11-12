import type { Metadata } from "next"

import { BenchHero } from "@/components/landing/bench-hero"
import { BenchLoop } from "@/components/landing/bench-loop"
import { BenchTeachers } from "@/components/landing/bench-teachers"
import { ClosingBench } from "@/components/landing/closing-bench"
import { InstitutionBench } from "@/components/landing/institution-bench"
import { MaterialShelf } from "@/components/landing/material-shelf"
import { OpenPaths } from "@/components/landing/open-paths"
import { ParticipantNotes } from "@/components/landing/participant-notes"
import { QuestionsSection } from "@/components/landing/questions-section"
import { SeasonNote } from "@/components/landing/season-note"
import { WorksShelf } from "@/components/landing/works-shelf"
import { WorkshopRules } from "@/components/landing/workshop-rules"
import { getSiteData } from "@/lib/convex/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import { buildLandingJsonLd } from "@/lib/structured-data"


export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()

  return buildPageMetadata("/", {
    title: {
      absolute: data.metadata.title,
    },
    description: data.metadata.description,
    alternates: {
      canonical: "/",
    },
  })
}

export default async function HomePage() {
  const data = await getSiteData()
  const jsonLd = buildLandingJsonLd(data)

  return (
    <div id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BenchHero hero={data.hero} workCard={data.heroWorkCard} />
      <BenchLoop loop={data.loop} />
      <MaterialShelf catalog={data.catalog} />
      <OpenPaths paths={data.paths} copy={data.sections.paths} />
      <BenchTeachers teachers={data.teachers} copy={data.sections.teachers} />
      <WorksShelf works={data.works} copy={data.sections.works} />
      <WorkshopRules ethics={data.ethics} />
      <SeasonNote mangsa={data.mangsa} />
      <InstitutionBench institution={data.institution} />
      <ParticipantNotes
        testimonials={data.testimonials}
        copy={data.sections.notes}
      />
      <QuestionsSection faqs={data.faqs} copy={data.sections.faq} />
      <ClosingBench traction={data.traction} copy={data.sections.closing} />
    </div>
  )
}
