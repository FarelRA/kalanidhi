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
import { buildLandingJsonLd } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: {
    absolute: "KalaNidhi Digital: belajar sampai bisa, bisa sampai mengajari",
  },
  description:
    "KalaNidhi Digital mempertemukan pelajar dengan pengajar praktik budaya Nusantara. Tugas dinilai manusia, sertifikat platform bisa diverifikasi, karya punya Kartu Karya. Lulusan dapat kembali sebagai pengajar, penilai, atau pemasok.",
  alternates: {
    canonical: "/",
  },
}

export default function HomePage() {
  const jsonLd = buildLandingJsonLd()

  return (
    <div id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BenchHero />
      <BenchLoop />
      <MaterialShelf />
      <OpenPaths />
      <BenchTeachers />
      <WorksShelf />
      <WorkshopRules />
      <SeasonNote />
      <InstitutionBench />
      <ParticipantNotes />
      <QuestionsSection />
      <ClosingBench />
    </div>
  )
}
