import { faqs } from "@/lib/content/landing"

export function buildLandingJsonLd() {
  const site = "https://kalanidhi.digital"

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${site}/#organization`,
        name: "KalaNidhi Digital",
        url: site,
        description:
          "Platform belajar seni dan kriya tradisi Nusantara dengan penilaian pengajar dan sertifikat platform.",
        areaServed: "ID",
        knowsLanguage: "id",
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: "KalaNidhi Digital",
        inLanguage: "id-ID",
        publisher: { "@id": `${site}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${site}/#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  }
}
