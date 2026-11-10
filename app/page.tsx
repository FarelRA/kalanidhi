import type { Metadata } from "next"

import { EthicsSection } from "@/components/landing/ethics-section"
import { FaqSection } from "@/components/landing/faq-section"
import { FeaturedPaths } from "@/components/landing/featured-paths"
import { FinalCta } from "@/components/landing/final-cta"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { InstitutionSection } from "@/components/landing/institution-section"
import { TeachersSection } from "@/components/landing/teachers-section"
import { MangsaTeaser } from "@/components/landing/mangsa-teaser"
import { StatsStrip } from "@/components/landing/stats-strip"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { WorksSection } from "@/components/landing/works-section"
import { buildLandingJsonLd } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: {
    absolute:
      "KalaNidhi Digital: Belajar praktik budaya, berkarya, kembali mengajar",
  },
  description:
    "KalaNidhi Digital menghubungkan pelajar dengan pengajar berbagai praktik budaya Nusantara. Belajar terstruktur, dinilai personal, tersertifikasi platform, lalu berkarya atau berjualan. Lulusan yang siap kembali sebagai pengajar, penilai, atau pemasok.",
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
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <FeaturedPaths />
      <TeachersSection />
      <WorksSection />
      <MangsaTeaser />
      <EthicsSection />
      <InstitutionSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCta />
    </div>
  )
}
